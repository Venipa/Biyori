use crate::types::Parsed;
use anitomy_ng::{parse, parse_path, ElementKind, Options};

const PLAYER_MARKERS: &[&str] = &[
	"mpv.net",
	"mpv",
	"vlc media player",
	"vlc",
	"mpc-hc64",
	"mpc-hc",
	"mpc-be",
	"potplayer",
	"kmplayer",
	"gom player",
];

pub fn strip_player_suffix(value: &str) -> &str {
	let lower = value.to_ascii_lowercase();
	if let Some(idx) = lower.rfind(" - ") {
		let rest = lower[idx + 3..].trim();
		if PLAYER_MARKERS.iter().any(|marker| rest.starts_with(marker)) {
			return value[..idx].trim();
		}
	}
	value.trim()
}

fn first_i32(value: &str) -> Option<i32> {
	let digits: String = value.chars().take_while(|ch| ch.is_ascii_digit()).collect();
	if digits.is_empty() {
		return None;
	}
	digits.parse().ok()
}

fn episode_range(elements: &[anitomy_ng::Element]) -> (Option<i32>, Option<i32>) {
	let mut numbers: Vec<i32> = elements
		.iter()
		.filter(|element| element.kind == ElementKind::Episode)
		.filter_map(|element| first_i32(&element.value))
		.collect();
	if numbers.is_empty() {
		return (None, None);
	}
	numbers.sort_unstable();
	(Some(numbers[0]), Some(*numbers.last().unwrap()))
}

pub fn elements_to_parsed(elements: &[anitomy_ng::Element]) -> Option<Parsed> {
	let title = elements
		.iter()
		.find(|element| element.kind == ElementKind::Title)
		.map(|element| element.value.trim().to_string())
		.filter(|title| !title.is_empty())?;
	let (low, high) = episode_range(elements);
	let season = elements
		.iter()
		.find(|element| element.kind == ElementKind::Season)
		.and_then(|element| first_i32(&element.value));
	let year = elements
		.iter()
		.find(|element| element.kind == ElementKind::Year)
		.and_then(|element| first_i32(&element.value));
	let group = elements
		.iter()
		.find(|element| element.kind == ElementKind::ReleaseGroup)
		.map(|element| element.value.clone());
	Some(Parsed {
		title,
		season,
		year,
		episode: high,
		episode_low: low,
		episode_high: high,
		group,
	})
}

pub fn parse_filename(input: &str) -> Option<Parsed> {
	let stripped = strip_player_suffix(input);
	elements_to_parsed(&parse(stripped, Options::default()))
}

pub fn parse_file_path(input: &str) -> Option<Parsed> {
	let stripped = strip_player_suffix(input);
	elements_to_parsed(&parse_path(stripped, Options::default())).or_else(|| parse_filename(stripped))
}

pub fn extend_title(parsed: &Parsed) -> String {
	let mut title = parsed.title.clone();
	if let Some(season) = parsed.season {
		if season > 1 {
			title = format!("{title} Season {season}");
		}
	}
	if let Some(year) = parsed.year {
		if year > 0 {
			title = format!("{title} ({year})");
		}
	}
	title
}

pub fn apply_ignored(input: &str, ignored: &[String]) -> String {
	let mut next = input.to_string();
	for item in ignored {
		if !item.is_empty() {
			next = next.replace(item, " ");
		}
	}
	next
}

pub fn parse_query(input: &crate::types::ParseInput) -> Option<crate::types::ParseResult> {
	let ignored = input.ignored.as_deref().unwrap_or(&[]);
	let text = apply_ignored(&input.input, ignored);
	let parsed = if input.path.unwrap_or(false) {
		parse_file_path(&text)
	} else {
		parse_filename(&text).or_else(|| parse_file_path(&text))
	}?;
	Some(crate::types::ParseResult {
		title: extend_title(&parsed),
		raw_title: parsed.title.clone(),
		season: parsed.season,
		year: parsed.year,
		episode: parsed.episode,
		episode_low: parsed.episode_low,
		episode_high: parsed.episode_high,
		group: parsed.group,
	})
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn parses_black_torch_erai_filename() {
		let parsed = parse_filename(
			"BLACK TORCH (2026) - S01E09 - 009 - ONE [WEBDL-1080p][8bit][x264][AAC 2.0][JA]-Erai-raws.mkv",
		)
		.expect("parse");
		assert_eq!(parsed.title, "BLACK TORCH");
		assert_eq!(parsed.season, Some(1));
		assert_eq!(parsed.year, Some(2026));
		assert_eq!(parsed.episode, Some(9));
		assert_eq!(extend_title(&parsed), "BLACK TORCH (2026)");
	}

	#[test]
	fn strips_mpvnet_window_suffix() {
		let parsed = parse_filename(
			"BLACK TORCH (2026) - S01E09 - 009 - ONE [WEBDL-1080p][8bit][x264][AAC 2.0][JA]-Erai-raws - mpv.net",
		)
		.expect("parse");
		assert_eq!(parsed.title, "BLACK TORCH");
		assert_eq!(parsed.episode, Some(9));
	}

	#[test]
	fn parse_path_uses_folder_title() {
		let parsed = parse_file_path(r"D:/Anime/Tensei Shitara Slime Datta Ken 4th Season/05.mkv").expect("parse");
		assert!(
			parsed.title.to_ascii_lowercase().contains("slime"),
			"title was {}",
			parsed.title
		);
		assert_eq!(parsed.episode, Some(5));
	}
}
