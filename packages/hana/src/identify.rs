use crate::parse::extend_title;
use crate::types::{Candidate, Parsed};

fn normalize_title(value: &str) -> String {
	let mut out = String::new();
	for ch in value.chars() {
		if ch.is_alphanumeric() {
			out.extend(ch.to_lowercase());
		} else if !out.ends_with(' ') && !out.is_empty() {
			out.push(' ');
		}
	}
	out.trim().to_string()
}

fn replace_season_phrases(value: &str) -> String {
	let mut next = value.to_string();
	const PAIRS: &[(&str, &str)] = &[
		("1st season", "1"),
		("season 1", "1"),
		("series 1", "1"),
		("2nd season", "2"),
		("season 2", "2"),
		("series 2", "2"),
		("3rd season", "3"),
		("season 3", "3"),
		("series 3", "3"),
		("4th season", "4"),
		("season 4", "4"),
		("series 4", "4"),
		("5th season", "5"),
		("season 5", "5"),
		("series 5", "5"),
		("6th season", "6"),
		("season 6", "6"),
		("series 6", "6"),
	];
	for (from, to) in PAIRS {
		next = next.replace(from, to);
	}
	next
}

pub fn normalize_for_lookup(value: &str) -> String {
	let spaced = normalize_title(value);
	let seasons = replace_season_phrases(&spaced);
	seasons.chars().filter(|ch| ch.is_alphanumeric()).collect()
}

fn lookup_keys(query: &str) -> Vec<String> {
	let key = normalize_for_lookup(query);
	let mut keys = vec![key.clone()];
	if key.len() > 4 {
		let tail = &key[key.len() - 4..];
		if tail.chars().all(|ch| ch.is_ascii_digit()) {
			let year: i32 = tail.parse().unwrap_or(0);
			if (1900..2100).contains(&year) {
				keys.push(key[..key.len() - 4].to_string());
			}
		}
	}
	keys.retain(|item| !item.is_empty());
	keys
}

fn path_under(file: &str, root: &str) -> bool {
	if root.is_empty() {
		return false;
	}
	let file = file.replace('\\', "/").to_ascii_lowercase();
	let folder = root.replace('\\', "/").to_ascii_lowercase().trim_end_matches('/').to_string();
	file == folder || file.starts_with(&format!("{folder}/"))
}

fn pool_for_path<'a>(path: &str, candidates: &'a [Candidate]) -> Vec<&'a Candidate> {
	let mut hits: Vec<&Candidate> = candidates
		.iter()
		.filter(|candidate| path_under(path, candidate.folder.as_deref().unwrap_or("")))
		.collect();
	if hits.is_empty() {
		return candidates.iter().collect();
	}
	let longest = hits
		.iter()
		.map(|candidate| candidate.folder.as_deref().unwrap_or("").len())
		.max()
		.unwrap_or(0);
	hits.retain(|candidate| candidate.folder.as_deref().unwrap_or("").len() == longest);
	hits
}

fn season_from_names(names: &[String]) -> Option<i32> {
	use std::sync::OnceLock;
	static RE: OnceLock<regex::Regex> = OnceLock::new();
	let re = RE.get_or_init(|| {
		#[allow(clippy::expect_used)]
		regex::Regex::new(r"(?i-u)(?:([0-9]+)(?:st|nd|rd|th) +season|(?:season|series) +([0-9]+)|s([0-9]{1,2}))\b")
			.expect("season name")
	});
	for name in names {
		if let Some(caps) = re.captures(name) {
			let value = caps
				.get(1)
				.or_else(|| caps.get(2))
				.or_else(|| caps.get(3))
				.and_then(|m| m.as_str().parse().ok());
			if let Some(season) = value.filter(|n| *n > 0) {
				return Some(season);
			}
		}
	}
	None
}

fn episode_in_range(parsed: &Parsed, total: i32) -> bool {
	let high = parsed.episode_high.or(parsed.episode).unwrap_or(1);
	if total < 1 {
		return true;
	}
	high >= 1 && high <= total
}

fn season_compatible(parsed: &Parsed, candidate: &Candidate) -> bool {
	let file = parsed.season.filter(|season| *season > 0);
	let listed = season_from_names(&candidate.names);
	match (file, listed) {
		(Some(fs), Some(ls)) => fs == ls,
		(Some(fs), None) => fs <= 1,
		(None, Some(ls)) => ls <= 1,
		(None, None) => true,
	}
}

pub fn identify(parsed: &Parsed, candidates: &[Candidate], path: Option<&str>) -> Option<i64> {
	let pool = if let Some(path) = path {
		pool_for_path(path, candidates)
	} else {
		candidates.iter().collect()
	};
	if pool.is_empty() {
		return None;
	}
	let query = extend_title(parsed);
	let keys = lookup_keys(&query);
	let mut exact: Vec<&Candidate> = Vec::new();
	for candidate in &pool {
		if candidate
			.names
			.iter()
			.any(|name| keys.iter().any(|key| normalize_for_lookup(name) == *key))
		{
			exact.push(candidate);
		}
	}
	let matched: Vec<&Candidate> = if exact.is_empty() { pool } else { exact };
	let hits: Vec<&Candidate> = matched
		.into_iter()
		.filter(|candidate| episode_in_range(parsed, candidate.episodes) && season_compatible(parsed, candidate))
		.collect();
	if hits.len() == 1 {
		return Some(hits[0].id);
	}
	None
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::parse::parse_file_path;
	use crate::types::Candidate;

	fn candidate(id: i64, name: &str, folder: &str) -> Candidate {
		Candidate {
			id,
			names: vec![name.to_string()],
			episodes: 12,
			folder: Some(folder.to_string()),
			status: None,
		}
	}

	#[test]
	fn folder_scope_prevents_cross_show_match() {
		let slime = candidate(10, "tensei shitara slime datta ken 4th season", r"D:\Anime\Tensei Shitara Slime Datta Ken 4th Season");
		let sao = candidate(20, "sword art online season 4", r"D:\Anime\Sword Art Online Season 4");
		let path = r"D:\Anime\Tensei Shitara Slime Datta Ken 4th Season\05.mkv";
		let parsed = parse_file_path(path).expect("parse");
		assert_eq!(identify(&parsed, &[slime, sao], Some(path)), Some(10));
	}

	fn rezero(id: i64, name: &str, episodes: i32, folder: &str) -> Candidate {
		Candidate {
			id,
			names: vec![name.to_string()],
			episodes,
			folder: Some(folder.to_string()),
			status: None,
		}
	}

	#[test]
	fn shared_folder_s04e15_matches_season_four() {
		let folder = r"Z:\anime\Re - ZERO, Starting Life in Another World (2016) [tvdbid-305089]";
		let s3 = rezero(3, "re:zero kara hajimeru isekai seikatsu 3rd season", 16, folder);
		let s4 = rezero(4, "re:zero kara hajimeru isekai seikatsu 4th season", 16, folder);
		let path = format!(
			r"{folder}\Re - ZERO, Starting Life in Another World (2016) - S04E15 - 081 - TBA [WEBDL-1080p].mkv"
		);
		let parsed = parse_file_path(&path).expect("parse");
		assert_eq!(parsed.season, Some(4));
		assert_eq!(parsed.episode, Some(15));
		assert_eq!(identify(&parsed, &[s3, s4], Some(&path)), Some(4));
	}

	#[test]
	fn shared_folder_s03e16_does_not_match_season_four() {
		let folder = r"Z:\anime\Re - ZERO, Starting Life in Another World (2016) [tvdbid-305089]";
		let s3 = rezero(3, "re:zero kara hajimeru isekai seikatsu 3rd season", 16, folder);
		let s4 = rezero(4, "re:zero kara hajimeru isekai seikatsu 4th season", 16, folder);
		let path = format!(
			r"{folder}\Re - ZERO, Starting Life in Another World (2016) - S03E16 - 065 - TBA [WEBDL-1080p].mkv"
		);
		let parsed = parse_file_path(&path).expect("parse");
		assert_eq!(identify(&parsed, &[s3, s4], Some(&path)), Some(3));
	}
}
