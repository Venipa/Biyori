use crate::identify::{match_candidates, match_candidates_with, NameIndex};
use crate::parse::parse_file_paths;
use crate::types::{FindEpisodeInput, Parsed, ScanHit, ScanInput, ScanProgress, ScanResult, VIDEO_EXT};
use dua_core::{walk, Options, Order};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::time::Instant;

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
		total: 0,
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
					total: 0,
				},
				false,
			);
		}) {
			scanned_roots.push(root.clone());
		}
	}
	let total = files.len() as u32;
	gate.emit(
		&mut report,
		ScanProgress {
			phase: "walk".into(),
			files: total,
			hits: 0,
			total: 0,
		},
		true,
	);
	let parsed_files = parse_videos(&files);
	let index = NameIndex::build(&input.candidates);
	let mut hits: Vec<ScanHit> = Vec::new();
	let relations = input.relations.as_deref().unwrap_or(&[]);
	if total > 0 {
		report(ScanProgress {
			phase: "match".into(),
			files: 0,
			hits: 0,
			total,
		});
	}
	for (index_i, (file, parsed)) in files.iter().zip(parsed_files).enumerate() {
		let examined = (index_i as u32).saturating_add(1);
		if index_i == 0 {
			gate.emit(
				&mut report,
				ScanProgress {
					phase: "match".into(),
					files: examined,
					hits: 0,
					total,
				},
				true,
			);
		}
		let display = file.path.to_string_lossy().to_string();
		if let Some(parsed) = parsed {
			if let Some((anime_id, episode)) = match_candidates_with(&parsed, &input.candidates, Some(&display), relations, Some(&index)) {
				hits.push(ScanHit {
					path: display,
					anime_id,
					episode,
					size: file.size.min(i64::MAX as u64) as i64,
				});
			}
		}
		gate.emit(
			&mut report,
			ScanProgress {
				phase: "match".into(),
				files: examined,
				hits: hits.len() as u32,
				total,
			},
			examined == total,
		);
	}
	let done = ScanProgress {
		phase: "done".into(),
		files: total,
		hits: hits.len() as u32,
		total,
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
	let parsed_files = parse_videos(&files);
	let candidates = input.candidates.as_deref().unwrap_or(&[]);
	let relations = input.relations.as_deref().unwrap_or(&[]);
	for (file, parsed) in files.iter().zip(parsed_files) {
		let Some(parsed) = parsed else {
			continue;
		};
		if let Some(anime_id) = input.anime_id {
			let path = file.path.to_string_lossy();
			let Some((id, _)) = match_candidates(&parsed, candidates, Some(path.as_ref()), relations) else {
				continue;
			};
			if id != anime_id {
				continue;
			}
		}
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
				relations: None,
				candidates: vec![
					Candidate {
						id: 10,
						names: vec!["tensei shitara slime datta ken 4th season".into()],
						episodes: 12,
						folder: Some(slime_dir.to_string_lossy().to_string()),
					},
					Candidate {
						id: 20,
						names: vec!["sword art online season 4".into()],
						episodes: 12,
						folder: Some(sao_dir.to_string_lossy().to_string()),
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
				relations: None,
				candidates: vec![Candidate {
					id: 30,
					names: vec!["frieren".into()],
					episodes: 12,
					folder: None,
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
			anime_id: None,
			candidates: None,
			relations: None,
		});
		assert_eq!(found.as_deref().map(Path::new), Some(wanted.as_path()));
		let _ = fs::remove_dir_all(folder);
	}

	#[test]
	fn find_episode_skips_other_season_in_shared_folder() {
		let folder = temp_root("rezero");
		write_video(
			&folder,
			"Re - ZERO, Starting Life in Another World (2016) - S03E16 - 065 - TBA.mkv",
			32,
		);
		let s4 = write_video(
			&folder,
			"Re - ZERO, Starting Life in Another World (2016) - S04E15 - 081 - TBA.mkv",
			32,
		);
		let candidates = vec![
			Candidate {
				id: 3,
				names: vec!["re:zero kara hajimeru isekai seikatsu 3rd season".into()],
				episodes: 16,
				folder: Some(folder.to_string_lossy().into_owned()),
			},
			Candidate {
				id: 4,
				names: vec!["re:zero kara hajimeru isekai seikatsu 4th season".into()],
				episodes: 16,
				folder: Some(folder.to_string_lossy().into_owned()),
			},
		];
		let found_16 = find_episode(FindEpisodeInput {
			folder: folder.to_string_lossy().to_string(),
			episode: 16,
			threshold: 1,
			anime_id: Some(4),
			candidates: Some(candidates.clone()),
			relations: None,
		});
		assert_eq!(found_16, None);
		let found_15 = find_episode(FindEpisodeInput {
			folder: folder.to_string_lossy().to_string(),
			episode: 15,
			threshold: 1,
			anime_id: Some(4),
			candidates: Some(candidates),
			relations: None,
		});
		assert_eq!(found_15.as_deref().map(Path::new), Some(s4.as_path()));
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
				relations: None,
				candidates: vec![Candidate {
					id: 40,
					names: vec!["show".into()],
					episodes: 12,
					folder: None,
				}],
			},
			 |_| {},
		);
		assert_eq!(result.files, 1);
		assert_eq!(result.hits.len(), 1);
		assert_eq!(result.hits[0].episode, 3);
		let _ = fs::remove_dir_all(folder);
	}

	#[test]
	fn match_progress_counts_files_that_do_not_match() {
		let folder = temp_root("miss");
		write_video(&folder, "Nope - 01.mkv", 32);
		write_video(&folder, "Nope - 02.mkv", 32);
		let mut examined = Vec::new();
		let result = scan_library(
			ScanInput {
				roots: vec![folder.to_string_lossy().to_string()],
				threshold: 1,
				relations: None,
				candidates: vec![Candidate {
					id: 1,
					names: vec!["other show".into()],
					episodes: 12,
					folder: None,
				}],
			},
			|progress| {
				if progress.phase == "match" {
					examined.push((progress.files, progress.total, progress.hits));
				}
			},
		);
		assert_eq!(result.files, 2);
		assert_eq!(result.hits.len(), 0);
		assert_eq!(examined.first().copied(), Some((0, 2, 0)));
		assert_eq!(examined.last().copied(), Some((2, 2, 0)));
		assert!(examined.iter().any(|item| item.0 > 0 && item.2 == 0));
		let _ = fs::remove_dir_all(folder);
	}
}
