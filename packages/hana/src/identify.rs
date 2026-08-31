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

fn episode_in_range(parsed: &Parsed, total: i32) -> bool {
	let episode = parsed.episode.unwrap_or(1);
	if total < 1 {
		return true;
	}
	episode >= 1 && episode <= total
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
		.filter(|candidate| episode_in_range(parsed, candidate.episodes))
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
}
