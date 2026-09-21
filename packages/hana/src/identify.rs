use crate::parse::extend_title;
use crate::types::{Candidate, Parsed, RelationRule};
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};

thread_local! {
	static LOOKUP_CACHE: RefCell<HashMap<String, String>> = RefCell::new(HashMap::new());
}

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

fn season_phrase_re() -> &'static regex::Regex {
	use std::sync::OnceLock;
	static RE: OnceLock<regex::Regex> = OnceLock::new();
	RE.get_or_init(|| {
		#[allow(clippy::expect_used)]
		regex::Regex::new(r"(?i-u)(?:([0-9]+)(?:st|nd|rd|th) +season|(?:season|series) +([0-9]+)|s([0-9]{1,2}))\b")
			.expect("season phrase")
	})
}

fn season_number_from_caps(caps: &regex::Captures) -> Option<i32> {
	caps.get(1)
		.or_else(|| caps.get(2))
		.or_else(|| caps.get(3))
		.and_then(|m| m.as_str().parse().ok())
		.filter(|n| *n > 0)
}

fn replace_season_phrases(value: &str) -> String {
	season_phrase_re()
		.replace_all(value, |caps: &regex::Captures| {
			season_number_from_caps(caps).map(|n| n.to_string()).unwrap_or_default()
		})
		.into_owned()
}

pub fn normalize_for_lookup(value: &str) -> String {
	LOOKUP_CACHE.with(|cache| {
		if let Some(cached) = cache.borrow().get(value) {
			return cached.clone();
		}
		let spaced = normalize_title(value);
		let seasons = replace_season_phrases(&spaced);
		let computed: String = seasons.chars().filter(|ch| ch.is_alphanumeric()).collect();
		cache.borrow_mut().insert(value.to_string(), computed.clone());
		computed
	})
}

fn lookup_keys(query: &str) -> Vec<String> {
	let key = normalize_for_lookup(query);
	let mut keys = vec![key.clone()];
	let bytes = key.as_bytes();
	if bytes.len() > 4 {
		let tail = &bytes[bytes.len() - 4..];
		if tail.iter().all(u8::is_ascii_digit) {
			let year: i32 = std::str::from_utf8(tail).ok().and_then(|s| s.parse().ok()).unwrap_or(0);
			if (1900..2100).contains(&year) {
				keys.push(key[..bytes.len() - 4].to_string());
			}
		}
	}
	keys.retain(|item| !item.is_empty());
	keys
}

fn normalize_fs_path(value: &str) -> String {
	let mut path = value.replace('\\', "/").to_lowercase();
	if let Some(stripped) = path.strip_prefix("//?/") {
		path = stripped.to_string();
	} else if let Some(stripped) = path.strip_prefix("//./") {
		path = stripped.to_string();
	}
	if let Some(stripped) = path.strip_prefix("unc/") {
		path = stripped.to_string();
	}
	while path.ends_with('/') {
		path.pop();
	}
	path
}

fn path_under(file: &str, root: &str) -> bool {
	if root.is_empty() {
		return false;
	}
	let file = normalize_fs_path(file);
	let folder = normalize_fs_path(root);
	if folder.is_empty() {
		return false;
	}
	file == folder || file.starts_with(&format!("{folder}/"))
}

fn pool_for_path<'a>(path: &str, candidates: &'a [Candidate]) -> (Vec<&'a Candidate>, bool) {
	let mut hits: Vec<&Candidate> = candidates
		.iter()
		.filter(|candidate| path_under(path, candidate.folder.as_deref().unwrap_or("")))
		.collect();
	if hits.is_empty() {
		return (candidates.iter().collect(), false);
	}
	let longest = hits
		.iter()
		.map(|candidate| candidate.folder.as_deref().unwrap_or("").len())
		.max()
		.unwrap_or(0);
	hits.retain(|candidate| candidate.folder.as_deref().unwrap_or("").len() == longest);
	(hits, true)
}

fn season_from_names(names: &[String]) -> Option<i32> {
	for name in names {
		if let Some(caps) = season_phrase_re().captures(name) {
			if let Some(season) = season_number_from_caps(&caps) {
				return Some(season);
			}
		}
	}
	None
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

const MATCH_FLOOR: f32 = 0.72;
const UNIQUE_MARGIN: f32 = 0.08;
const SIMILAR_FLOOR: f32 = 0.25;
const SIMILAR_LIMIT: usize = 10;
const DICE_POOL_MAX: usize = 32;

fn strip_season(value: &str) -> String {
	season_phrase_re()
		.replace_all(value, " ")
		.split_whitespace()
		.collect::<Vec<_>>()
		.join(" ")
}

fn dice(left: &str, right: &str) -> f32 {
	if left.is_empty() || right.is_empty() {
		return 0.0;
	}
	if left == right {
		return 1.0;
	}
	let mut grams = HashSet::new();
	let right_chars: Vec<char> = right.chars().collect();
	for pair in right_chars.windows(2) {
		grams.insert((pair[0], pair[1]));
	}
	let left_chars: Vec<char> = left.chars().collect();
	if left_chars.len() < 2 || right_chars.len() < 2 {
		return 0.0;
	}
	let mut hits = 0u32;
	for pair in left_chars.windows(2) {
		if grams.contains(&(pair[0], pair[1])) {
			hits += 1;
		}
	}
	(2.0 * hits as f32) / (left_chars.len().saturating_sub(1) as f32 + grams.len() as f32)
}

fn length_ratio(left: &str, right: &str) -> f32 {
	let max = left.len().max(right.len());
	if max == 0 {
		0.0
	} else {
		left.len().min(right.len()) as f32 / max as f32
	}
}

fn extra_season(value: &str) -> bool {
	let trimmed = value.trim();
	!trimmed.is_empty() && strip_season(trimmed).is_empty()
}

fn name_score(name: &str, needle: &str, needle_key: &str) -> f32 {
	if name == needle || normalize_for_lookup(name) == needle_key {
		return 1.0;
	}
	let base_name = strip_season(name);
	let base_needle = strip_season(needle);
	if !base_name.is_empty()
		&& !base_needle.is_empty()
		&& normalize_for_lookup(&base_name) == normalize_for_lookup(&base_needle)
	{
		return 0.92;
	}
	if name.contains(needle) {
		return length_ratio(name, needle);
	}
	if needle.contains(name) {
		let extra = needle[needle.find(name).unwrap_or(0) + name.len()..].trim();
		if extra.chars().all(|ch| ch.is_ascii_digit()) && extra.len() == 4 {
			return 0.92;
		}
		return if extra_season(extra) {
			0.35
		} else {
			length_ratio(name, needle) * 0.9
		};
	}
	dice(if base_name.is_empty() { name } else { &base_name }, if base_needle.is_empty() { needle } else { &base_needle })
}

fn score_candidate(candidate: &Candidate, needle: &str, needle_key: &str, season: Option<i32>) -> f32 {
	let mut score = 0.0f32;
	for name in &candidate.names {
		score = score.max(name_score(name, needle, needle_key));
	}
	if season.unwrap_or(0) <= 1 {
		return score;
	}
	match season_from_names(&candidate.names) {
		Some(listed) if listed == season.unwrap_or(0) => score + 0.12,
		Some(_) => score - 0.35,
		None if score >= 0.7 => score - 0.2,
		None => score,
	}
}

pub(crate) struct NameIndex {
	by_key: HashMap<String, Vec<u32>>,
}

impl NameIndex {
	pub(crate) fn build(candidates: &[Candidate]) -> Self {
		let mut by_key: HashMap<String, Vec<u32>> = HashMap::new();
		for (index, candidate) in candidates.iter().enumerate() {
			let mut seen = HashSet::new();
			for name in &candidate.names {
				for key in lookup_keys(name) {
					if !seen.insert(key.clone()) {
						continue;
					}
					by_key.entry(key).or_default().push(index as u32);
				}
			}
		}
		Self { by_key }
	}

	fn exact<'a>(&self, query: &str, candidates: &'a [Candidate]) -> Vec<&'a Candidate> {
		let mut out = Vec::new();
		let mut seen = HashSet::new();
		for key in lookup_keys(query) {
			let Some(indexes) = self.by_key.get(&key) else {
				continue;
			};
			for &index in indexes {
				let Some(candidate) = candidates.get(index as usize) else {
					continue;
				};
				if seen.insert(candidate.id) {
					out.push(candidate);
				}
			}
		}
		out
	}
}

fn exact_hits<'a>(query: &str, pool: &[&'a Candidate], all: &'a [Candidate], index: Option<&NameIndex>) -> Vec<&'a Candidate> {
	if let Some(index) = index {
		let mut hits = index.exact(query, all);
		if pool.len() != all.len() {
			hits.retain(|hit| pool.iter().any(|item| std::ptr::eq(*item, *hit)));
		}
		return hits;
	}
	let keys = lookup_keys(query);
	pool.iter()
		.copied()
		.filter(|candidate| candidate.names.iter().any(|name| keys.iter().any(|key| normalize_for_lookup(name) == *key)))
		.collect()
}

fn match_title<'a>(query: &str, pool: &[&'a Candidate], season: Option<i32>, all: &'a [Candidate], index: Option<&NameIndex>) -> Option<&'a Candidate> {
	let needle = normalize_title(query);
	if needle.is_empty() {
		return None;
	}
	let lookup_key = normalize_for_lookup(query);
	let exact = exact_hits(query, pool, all, index);
	if exact.len() == 1 {
		return Some(exact[0]);
	}
	if pool.len() > DICE_POOL_MAX {
		return None;
	}
	let scored = if exact.len() > 1 { exact } else { pool.to_vec() };
	let mut best: Option<(&Candidate, f32)> = None;
	let mut second = 0.0f32;
	for candidate in scored {
		let score = score_candidate(candidate, &needle, &lookup_key, season);
		if let Some((_, best_score)) = best {
			if score > best_score {
				second = best_score;
				best = Some((candidate, score));
			} else if score > second {
				second = score;
			}
		} else {
			best = Some((candidate, score));
		}
	}
	let (candidate, score) = best?;
	if score < MATCH_FLOOR {
		return None;
	}
	if score < 1.0 && score - second < UNIQUE_MARGIN {
		return None;
	}
	Some(candidate)
}

fn rank_parsed<'a>(parsed: &Parsed, pool: &[&'a Candidate]) -> Vec<&'a Candidate> {
	if pool.len() > DICE_POOL_MAX {
		return Vec::new();
	}
	let query = extend_title(parsed);
	let needle = normalize_title(&query);
	if needle.is_empty() {
		return Vec::new();
	}
	let lookup_key = normalize_for_lookup(&query);
	let mut ranked: Vec<(&Candidate, f32)> = pool
		.iter()
		.copied()
		.map(|candidate| (candidate, score_candidate(candidate, &needle, &lookup_key, parsed.season)))
		.filter(|item| item.1 >= SIMILAR_FLOOR)
		.collect();
	ranked.sort_by(|left, right| right.1.partial_cmp(&left.1).unwrap_or(std::cmp::Ordering::Equal));
	ranked.into_iter().take(SIMILAR_LIMIT).map(|item| item.0).collect()
}

fn apply_relation_rule(id: i64, episode: i32, rules: &[RelationRule]) -> (i64, i32) {
	for rule in rules {
		if rule.from_id != id {
			continue;
		}
		if episode < rule.from_start {
			continue;
		}
		if rule.from_end.is_some_and(|end| episode > end) {
			continue;
		}
		return (rule.to_id, episode - rule.from_start + rule.to_start);
	}
	(id, episode)
}

fn redirect_if_out_of_range(candidate: &Candidate, episode: i32, rules: &[RelationRule]) -> (i64, i32) {
	if candidate.episodes <= 0 || episode <= candidate.episodes {
		return (candidate.id, episode);
	}
	apply_relation_rule(candidate.id, episode, rules)
}

fn unique_redirect(episode: i32, candidates: &[&Candidate], rules: &[RelationRule]) -> Option<(i64, i32)> {
	let mut dest: Vec<(i64, i32)> = Vec::new();
	for candidate in candidates {
		let redirected = redirect_if_out_of_range(candidate, episode, rules);
		if redirected.0 == candidate.id && redirected.1 == episode {
			continue;
		}
		if dest.iter().any(|(id, ep)| *id == redirected.0 && *ep != redirected.1) {
			return None;
		}
		if !dest.iter().any(|(id, _)| *id == redirected.0) {
			dest.push(redirected);
		}
	}
	if dest.len() == 1 {
		Some(dest[0])
	} else {
		None
	}
}

fn relation_hop_candidates<'a>(parsed: &Parsed, pool: &[&'a Candidate]) -> Vec<&'a Candidate> {
	let ranked = rank_parsed(parsed, pool);
	let base = normalize_title(&parsed.title);
	let extra = if base.is_empty() {
		Vec::new()
	} else {
		let prefix = format!("{base} ");
		pool.iter()
			.copied()
			.filter(|candidate| candidate.names.iter().any(|name| name == &base || name.starts_with(&prefix)))
			.collect()
	};
	let mut seen = HashSet::new();
	let mut next = Vec::new();
	for candidate in ranked.into_iter().chain(extra) {
		if seen.insert(candidate.id) {
			next.push(candidate);
		}
	}
	next
}

fn pick_season_compatible<'a>(parsed: &Parsed, pool: &[&'a Candidate]) -> Option<&'a Candidate> {
	if parsed.season.unwrap_or(0) <= 1 {
		return None;
	}
	let fits: Vec<&Candidate> = pool.iter().copied().filter(|candidate| season_compatible(parsed, candidate)).collect();
	match fits.len() {
		0 => None,
		1 => Some(fits[0]),
		_ => rank_parsed(parsed, &fits).into_iter().next(),
	}
}

fn with_redirect(hit: &Candidate, episode: i32, all: &[Candidate], rules: &[RelationRule]) -> (i64, i32) {
	let redirected = redirect_if_out_of_range(hit, episode, rules);
	if redirected.0 == hit.id || all.iter().any(|candidate| candidate.id == redirected.0) {
		redirected
	} else {
		(hit.id, redirected.1)
	}
}

fn resolve_on_pool(parsed: &Parsed, pool: &[&Candidate], all: &[Candidate], rules: &[RelationRule], index: Option<&NameIndex>) -> Option<(i64, i32)> {
	if pool.is_empty() {
		return None;
	}
	let query = extend_title(parsed);
	let matched = match_title(&query, pool, parsed.season, all, index);
	let Some(episode) = parsed.episode else {
		return matched.map(|hit| (hit.id, 1));
	};
	if let Some(hit) = matched {
		if season_compatible(parsed, hit) {
			return Some(with_redirect(hit, episode, all, rules));
		}
	}
	if pool.len() > DICE_POOL_MAX {
		return matched.map(|hit| with_redirect(hit, episode, all, rules));
	}
	if let Some(season_hit) = pick_season_compatible(parsed, pool) {
		return Some(with_redirect(season_hit, episode, all, rules));
	}
	if parsed.season.unwrap_or(0) > 1 {
		if let Some(hopped) = unique_redirect(episode, &relation_hop_candidates(parsed, pool), rules) {
			return Some(hopped);
		}
	}
	matched.map(|hit| with_redirect(hit, episode, all, rules))
}

pub fn match_candidates(parsed: &Parsed, candidates: &[Candidate], path: Option<&str>, rules: &[RelationRule]) -> Option<(i64, i32)> {
	match_candidates_with(parsed, candidates, path, rules, None)
}

pub(crate) fn match_candidates_with(
	parsed: &Parsed,
	candidates: &[Candidate],
	path: Option<&str>,
	rules: &[RelationRule],
	index: Option<&NameIndex>,
) -> Option<(i64, i32)> {
	let all_refs: Vec<&Candidate> = candidates.iter().collect();
	let (scoped, folder_scoped) = if let Some(path) = path {
		pool_for_path(path, candidates)
	} else {
		(all_refs.clone(), false)
	};
	let hit = resolve_on_pool(parsed, &scoped, candidates, rules, index);
	if hit.is_some() || folder_scoped {
		return hit;
	}
	if scoped.len() == all_refs.len() {
		return hit;
	}
	resolve_on_pool(parsed, &all_refs, candidates, rules, index)
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
		}
	}

	#[test]
	fn folder_scope_prevents_cross_show_match() {
		let slime = candidate(10, "tensei shitara slime datta ken 4th season", r"D:\Anime\Tensei Shitara Slime Datta Ken 4th Season");
		let sao = candidate(20, "sword art online season 4", r"D:\Anime\Sword Art Online Season 4");
		let path = r"D:\Anime\Tensei Shitara Slime Datta Ken 4th Season\05.mkv";
		let parsed = parse_file_path(path).expect("parse");
		assert_eq!(match_candidates(&parsed, &[slime, sao], Some(path), &[]).map(|(id, _)| id), Some(10));
	}

	#[test]
	fn lookup_keeps_season_seven() {
		assert_eq!(normalize_for_lookup("Foo 7th Season"), normalize_for_lookup("Foo Season 7"));
		assert_eq!(normalize_for_lookup("Foo S07"), normalize_for_lookup("Foo 7th season"));
	}

	#[test]
	fn lookup_keys_cjk_does_not_panic() {
		assert_eq!(lookup_keys("占領区域特別行政区"), vec![normalize_for_lookup("占領区域特別行政区")]);
	}

	#[test]
	fn lookup_keys_strips_trailing_year() {
		assert_eq!(
			lookup_keys("Foo 2016"),
			vec![normalize_for_lookup("Foo 2016"), normalize_for_lookup("Foo")]
		);
	}

	#[test]
	fn folder_scope_matches_windows_extended_prefix() {
		let slime = candidate(10, "tensei shitara slime datta ken 4th season", r"D:\Anime\Tensei Shitara Slime Datta Ken 4th Season");
		let sao = candidate(20, "sword art online season 4", r"D:\Anime\Sword Art Online Season 4");
		let parsed = parse_file_path(r"D:\Anime\Tensei Shitara Slime Datta Ken 4th Season\05.mkv").expect("parse");
		let path = r"\\?\D:\Anime\Tensei Shitara Slime Datta Ken 4th Season\05.mkv";
		assert_eq!(match_candidates(&parsed, &[slime, sao], Some(path), &[]).map(|(id, _)| id), Some(10));
	}

	fn rezero(id: i64, name: &str, episodes: i32, folder: &str) -> Candidate {
		Candidate {
			id,
			names: vec![name.to_string()],
			episodes,
			folder: Some(folder.to_string()),
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
		assert_eq!(match_candidates(&parsed, &[s3, s4], Some(&path), &[]).map(|(id, _)| id), Some(4));
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
		assert_eq!(match_candidates(&parsed, &[s3, s4], Some(&path), &[]).map(|(id, _)| id), Some(3));
	}

	fn listed(id: i64, names: &[&str], episodes: i32) -> Candidate {
		Candidate {
			id,
			names: names.iter().map(|name| name.to_string()).collect(),
			episodes,
			folder: None,
		}
	}

	fn parts(title: &str, season: i32, year: i32, episode: i32) -> Parsed {
		Parsed {
			title: title.into(),
			raw_title: title.into(),
			season: Some(season),
			year: Some(year),
			episode: Some(episode),
			episode_low: Some(episode),
			episode_high: Some(episode),
			group: None,
			video_resolution: String::new(),
			video_term: String::new(),
			release_version: 1,
			file_extension: String::new(),
		}
	}

	#[test]
	fn hops_bleach_s17e47_to_calamity() {
		let rules = [
			RelationRule {
				from_id: 116674,
				from_start: 41,
				from_end: Some(50),
				to_id: 185874,
				to_start: 1,
			},
			RelationRule {
				from_id: 185874,
				from_start: 41,
				from_end: Some(50),
				to_id: 185874,
				to_start: 1,
			},
		];
		let list = [
			listed(269, &["bleach"], 366),
			listed(185874, &["bleach thousand year blood war the calamity"], 10),
		];
		assert_eq!(
			match_candidates(&parts("Bleach", 17, 2004, 47), &list, None, &rules),
			Some((185874, 7))
		);
	}

	#[test]
	fn keeps_rezero_s04e16_on_fourth_season() {
		let rules = [
			RelationRule {
				from_id: 2,
				from_start: 14,
				from_end: Some(25),
				to_id: 3,
				to_start: 1,
			},
			RelationRule {
				from_id: 3,
				from_start: 14,
				from_end: Some(25),
				to_id: 3,
				to_start: 1,
			},
		];
		let list = [
			listed(
				2,
				&["re:zero kara hajimeru isekai seikatsu 2nd season", "re - zero, starting life in another world 2nd season"],
				13,
			),
			listed(
				3,
				&[
					"re:zero kara hajimeru isekai seikatsu 2nd season part 2",
					"re - zero, starting life in another world 2nd season part 2",
				],
				12,
			),
			listed(
				4,
				&["re:zero kara hajimeru isekai seikatsu 4th season", "re - zero, starting life in another world 4th season"],
				12,
			),
		];
		assert_eq!(
			match_candidates(&parts("Re - ZERO, Starting Life in Another World", 4, 2016, 16), &list, None, &rules),
			Some((4, 16))
		);
	}
}
