use crate::identify::identify;
use crate::parse::parse_file_path;
use crate::types::{FindEpisodeInput, ScanHit, ScanInput, ScanProgress, ScanResult};
use jwalk::WalkDir;
use std::path::{Path, PathBuf};
use std::time::Instant;

const VIDEO_EXT: &[&str] = &[
	"mkv", "mp4", "avi", "webm", "mov", "wmv", "flv", "ts", "m2ts", "mpg", "mpeg",
];

struct VideoFile {
	path: PathBuf,
	size: u64,
}

fn is_video(path: &Path) -> bool {
	path.extension()
		.and_then(|ext| ext.to_str())
		.map(|ext| VIDEO_EXT.iter().any(|item| ext.eq_ignore_ascii_case(item)))
		.unwrap_or(false)
}

fn collect_files(root: &Path, threshold: u64, out: &mut Vec<VideoFile>, mut on_file: impl FnMut(u32)) -> bool {
	if !root.exists() {
		return false;
	}
	for entry in WalkDir::new(root).into_iter().flatten() {
		if !entry.file_type().is_file() {
			continue;
		}
		let path = entry.path();
		if !is_video(&path) {
			continue;
		}
		let Ok(meta) = path.metadata() else {
			continue;
		};
		if meta.len() < threshold {
			continue;
		}
		out.push(VideoFile {
			size: meta.len(),
			path,
		});
		on_file(out.len() as u32);
	}
	true
}

struct ProgressGate {
	last: Instant,
	files: u32,
}

impl ProgressGate {
	fn new() -> Self {
		Self {
			last: Instant::now(),
			files: 0,
		}
	}

	fn emit(&mut self, report: &mut impl FnMut(ScanProgress), progress: ScanProgress, force: bool) {
		let jumped = progress.files.abs_diff(self.files) >= 32;
		if force || jumped || self.last.elapsed().as_millis() >= 80 {
			self.last = Instant::now();
			self.files = progress.files;
			report(progress);
		}
	}
}

pub fn scan_library(input: ScanInput, mut report: impl FnMut(ScanProgress)) -> ScanResult {
	let mut files: Vec<VideoFile> = Vec::new();
	let mut scanned_roots: Vec<String> = Vec::new();
	let mut gate = ProgressGate::new();
	report(ScanProgress {
		phase: "walk".into(),
		files: 0,
		hits: 0,
	});
	for root in &input.roots {
		let path = Path::new(root);
		if collect_files(path, input.threshold.max(0) as u64, &mut files, |count| {
			gate.emit(
				&mut report,
				ScanProgress {
					phase: "walk".into(),
					files: count,
					hits: 0,
				},
				false,
			);
		}) {
			scanned_roots.push(root.clone());
		}
	}
	gate.emit(
		&mut report,
		ScanProgress {
			phase: "walk".into(),
			files: files.len() as u32,
			hits: 0,
		},
		true,
	);
	let mut hits: Vec<ScanHit> = Vec::new();
	let total = files.len() as u32;
	report(ScanProgress {
		phase: "match".into(),
		files: total,
		hits: 0,
	});
	for file in &files {
		let display = file.path.to_string_lossy().to_string();
		let Some(parsed) = parse_file_path(&display) else {
			continue;
		};
		let Some(anime_id) = identify(&parsed, &input.candidates, Some(&display)) else {
			continue;
		};
		hits.push(ScanHit {
			path: display,
			anime_id,
			episode: parsed.episode.unwrap_or(1),
			size: file.size.min(i64::MAX as u64) as i64,
		});
		gate.emit(
			&mut report,
			ScanProgress {
				phase: "match".into(),
				files: total,
				hits: hits.len() as u32,
			},
			false,
		);
	}
	let done = ScanProgress {
		phase: "done".into(),
		files: total,
		hits: hits.len() as u32,
	};
	report(done);
	ScanResult {
		files: total,
		scanned_roots,
		hits,
	}
}

pub fn find_episode(input: FindEpisodeInput) -> Option<String> {
	if input.folder.is_empty() {
		return None;
	}
	let mut files: Vec<VideoFile> = Vec::new();
	collect_files(Path::new(&input.folder), input.threshold.max(0) as u64, &mut files, |_| {});
	for file in files {
		let display = file.path.to_string_lossy().to_string();
		let Some(parsed) = parse_file_path(&display) else {
			continue;
		};
		let low = parsed.episode_low.or(parsed.episode)?;
		let high = parsed.episode_high.or(parsed.episode)?;
		if input.episode >= low && input.episode <= high {
			return Some(display);
		}
	}
	None
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::types::Candidate;
	use std::fs;
	use std::io::Write;
	use std::time::{SystemTime, UNIX_EPOCH};

	fn write_video(dir: &Path, name: &str, bytes: usize) -> PathBuf {
		fs::create_dir_all(dir).unwrap();
		let path = dir.join(name);
		let mut file = fs::File::create(&path).unwrap();
		file.write_all(&vec![0u8; bytes]).unwrap();
		path
	}

	fn temp_root(label: &str) -> PathBuf {
		let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
		let root = std::env::temp_dir().join(format!("hana-{label}-{nanos}"));
		fs::create_dir_all(&root).unwrap();
		root
	}

	#[test]
	fn scan_keeps_season_four_titles_in_their_folders() {
		let root = temp_root("scan");
		let slime_dir = root.join("Tensei Shitara Slime Datta Ken 4th Season");
		let sao_dir = root.join("Sword Art Online Season 4");
		let slime_file = write_video(&slime_dir, "05.mkv", 64);
		let sao_file = write_video(&sao_dir, "05.mkv", 64);
		let result = scan_library(
			ScanInput {
				roots: vec![root.to_string_lossy().to_string()],
				threshold: 1,
				candidates: vec![
					Candidate {
						id: 10,
						names: vec!["tensei shitara slime datta ken 4th season".into()],
						episodes: 12,
						folder: Some(slime_dir.to_string_lossy().to_string()),
						status: None,
					},
					Candidate {
						id: 20,
						names: vec!["sword art online season 4".into()],
						episodes: 12,
						folder: Some(sao_dir.to_string_lossy().to_string()),
						status: None,
					},
				],
			},
			 |_| {},
		);
		assert_eq!(result.files, 2);
		assert_eq!(result.hits.len(), 2);
		let slime = result.hits.iter().find(|hit| Path::new(&hit.path) == slime_file).unwrap();
		let sao = result.hits.iter().find(|hit| Path::new(&hit.path) == sao_file).unwrap();
		assert_eq!(slime.anime_id, 10);
		assert_eq!(slime.episode, 5);
		assert_eq!(sao.anime_id, 20);
		assert_eq!(sao.episode, 5);
		let _ = fs::remove_dir_all(root);
	}

	#[test]
	fn find_episode_returns_matching_file() {
		let folder = temp_root("ep");
		write_video(&folder, "04.mkv", 32);
		let wanted = write_video(&folder, "05.mkv", 32);
		let found = find_episode(FindEpisodeInput {
			folder: folder.to_string_lossy().to_string(),
			episode: 5,
			threshold: 1,
		});
		assert_eq!(found.as_deref().map(Path::new), Some(wanted.as_path()));
		let _ = fs::remove_dir_all(folder);
	}
}
