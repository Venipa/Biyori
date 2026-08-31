use crate::identify::identify;
use crate::parse::parse_file_paths;
use crate::types::{FindEpisodeInput, Parsed, ScanHit, ScanInput, ScanProgress, ScanResult};
use dua_core::{walk, Options, Order};
use std::collections::BTreeMap;
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

fn push_video(path: PathBuf, size: u64, threshold: u64, out: &mut Vec<VideoFile>, on_file: &mut impl FnMut(u32)) {
	if !is_video(&path) || size < threshold {
		return;
	}
	out.push(VideoFile { size, path });
	on_file(out.len() as u32);
}

fn walk_threads() -> usize {
	std::thread::available_parallelism().map(std::num::NonZero::get).unwrap_or(4)
}

fn collect_files(root: &Path, threshold: u64, out: &mut Vec<VideoFile>, mut on_file: impl FnMut(u32)) -> bool {
	if !root.exists() {
		return false;
	}
	if root.is_file() {
		let size = root.metadata().map(|meta| meta.len()).unwrap_or(0);
		push_video(root.to_path_buf(), size, threshold, out, &mut on_file);
		return true;
	}
	for item in walk(root, walk_threads(), Order::ParentFirst, Options::default(), |_| true) {
		let Ok(entry) = item else {
			continue;
		};
		if !entry.file_type.is_file() {
			continue;
		}
		let size = entry.metadata.as_ref().map(|meta| meta.len()).unwrap_or(0);
		push_video(entry.path(), size, threshold, out, &mut on_file);
	}
	true
}

fn parent_dir(path: &Path) -> PathBuf {
	path.parent().map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from("."))
}

fn parse_videos(files: &[VideoFile]) -> Vec<Option<Parsed>> {
	let mut groups: BTreeMap<PathBuf, Vec<usize>> = BTreeMap::new();
	for (index, file) in files.iter().enumerate() {
		groups.entry(parent_dir(&file.path)).or_default().push(index);
	}
	let mut out = vec![None; files.len()];
	for indexes in groups.values() {
		let paths: Vec<String> = indexes
			.iter()
			.map(|index| files[*index].path.to_string_lossy().into_owned())
			.collect();
		let inputs: Vec<&str> = paths.iter().map(String::as_str).collect();
		for (index, parsed) in indexes.iter().zip(parse_file_paths(&inputs)) {
			out[*index] = parsed;
		}
	}
	out
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
	for (file, parsed) in files.iter().zip(parse_videos(&files)) {
		let display = file.path.to_string_lossy().to_string();
		let Some(parsed) = parsed else {
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
	for (file, parsed) in files.iter().zip(parse_videos(&files)) {
		let Some(parsed) = parsed else {
			continue;
		};
		let Some(low) = parsed.episode_low.or(parsed.episode) else {
			continue;
		};
		let Some(high) = parsed.episode_high.or(parsed.episode) else {
			continue;
		};
		if input.episode >= low && input.episode <= high {
			return Some(file.path.to_string_lossy().into_owned());
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
	fn scan_uses_folder_batch_for_episode_numbers() {
		let root = temp_root("batch");
		let dir = root.join("Frieren (01-12) [Batch]");
		let ep5 = write_video(&dir, "Frieren - 05 [1080p].mkv", 64);
		let ep6 = write_video(&dir, "Frieren - 06 [1080p].mkv", 64);
		let result = scan_library(
			ScanInput {
				roots: vec![root.to_string_lossy().to_string()],
				threshold: 1,
				candidates: vec![Candidate {
					id: 30,
					names: vec!["frieren".into()],
					episodes: 12,
					folder: None,
					status: None,
				}],
			},
			 |_| {},
		);
		assert_eq!(result.hits.len(), 2);
		let hit5 = result.hits.iter().find(|hit| Path::new(&hit.path) == ep5).unwrap();
		let hit6 = result.hits.iter().find(|hit| Path::new(&hit.path) == ep6).unwrap();
		assert_eq!(hit5.episode, 5);
		assert_eq!(hit6.episode, 6);
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

	#[test]
	fn scan_accepts_a_single_file_root() {
		let folder = temp_root("one");
		let file = write_video(&folder, "Show - 03.mkv", 32);
		let result = scan_library(
			ScanInput {
				roots: vec![file.to_string_lossy().to_string()],
				threshold: 1,
				candidates: vec![Candidate {
					id: 40,
					names: vec!["show".into()],
					episodes: 12,
					folder: None,
					status: None,
				}],
			},
			 |_| {},
		);
		assert_eq!(result.files, 1);
		assert_eq!(result.hits.len(), 1);
		assert_eq!(result.hits[0].episode, 3);
		let _ = fs::remove_dir_all(folder);
	}
}
