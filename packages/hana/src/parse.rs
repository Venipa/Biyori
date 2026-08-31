use crate::anitomy::{parse, parse_path, Element, ElementKind, Options};
use crate::types::Parsed;

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

fn episode_range(elements: &[Element]) -> (Option<i32>, Option<i32>) {
	let mut numbers: Vec<i32> = elements
		.iter()
		.filter(|element| element.kind == ElementKind::Episode)
		.filter_map(|element| first_i32(&element.value))
		.collect();
	if numbers.is_empty() {
		return (None, None);
	}
	numbers.sort_unstable();
	(Some(numbers[0]), numbers.last().copied())
}

pub fn elements_to_parsed(elements: &[Element]) -> Option<Parsed> {
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
	parse_file_paths(&[input]).into_iter().next().flatten()
}

pub fn parse_file_paths(inputs: &[&str]) -> Vec<Option<Parsed>> {
	if inputs.is_empty() {
		return Vec::new();
	}
	let stripped: Vec<&str> = inputs.iter().copied().map(strip_player_suffix).collect();
	crate::anitomy::parse_together(&stripped, Options::default())
		.into_iter()
		.zip(stripped.iter().copied())
		.map(|(elements, text)| elements_to_parsed(&elements).or_else(|| parse_filename(text)))
		.collect()
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

fn to_parse_result(parsed: Parsed) -> crate::types::ParseResult {
	crate::types::ParseResult {
		title: extend_title(&parsed),
		raw_title: parsed.title.clone(),
		season: parsed.season,
		year: parsed.year,
		episode: parsed.episode,
		episode_low: parsed.episode_low,
		episode_high: parsed.episode_high,
		group: parsed.group,
	}
}

pub fn parse_query(input: &crate::types::ParseInput) -> Option<crate::types::ParseResult> {
	let ignored = input.ignored.as_deref().unwrap_or(&[]);
	let text = apply_ignored(&input.input, ignored);
	let parsed = if input.path.unwrap_or(false) {
		parse_file_path(&text)
	} else {
		parse_filename(&text).or_else(|| parse_file_path(&text))
	}?;
	Some(to_parse_result(parsed))
}

pub fn parse_together_query(input: &crate::types::ParseTogetherInput) -> Vec<Option<crate::types::ParseResult>> {
	let ignored = input.ignored.as_deref().unwrap_or(&[]);
	let texts: Vec<String> = input
		.inputs
		.iter()
		.map(|item| apply_ignored(item, ignored))
		.collect();
	let refs: Vec<&str> = texts.iter().map(String::as_str).collect();
	parse_file_paths(&refs)
		.into_iter()
		.map(|parsed| parsed.map(to_parse_result))
		.collect()
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

	fn first_kind(elements: &[Element], kind: ElementKind) -> Option<&str> {
		elements
			.iter()
			.find(|element| element.kind == kind)
			.map(|element| element.value.as_str())
	}

	fn episode_values(elements: &[Element]) -> Vec<&str> {
		elements
			.iter()
			.filter(|element| element.kind == ElementKind::Episode)
			.map(|element| element.value.as_str())
			.collect()
	}

	#[test]
	fn parse_path_strips_echoed_folder_title() {
		let options = Options::default();
		let input = "My Show/My Show - 01.mkv";
		assert_eq!(
			first_kind(&crate::anitomy::parse(input, options), ElementKind::Title),
			Some("My Show/My Show")
		);
		assert_eq!(
			first_kind(&parse_path(input, options), ElementKind::Title),
			Some("My Show")
		);
	}

	#[test]
	fn parse_path_drops_batch_folder_range() {
		let options = Options::default();
		let input = "Frieren (01-12) [Batch]/Frieren - 05 [1080p].mkv";
		assert_eq!(episode_values(&crate::anitomy::parse(input, options)), ["01", "12"]);
		assert_eq!(episode_values(&parse_path(input, options)), ["05"]);
	}

	#[test]
	fn parse_together_uses_per_file_episode_not_folder_range() {
		let parsed = parse_file_paths(&[
			"Frieren (01-12) [Batch]/Frieren - 05 [1080p].mkv",
			"Frieren (01-12) [Batch]/Frieren - 06 [1080p].mkv",
		]);
		assert_eq!(parsed.len(), 2);
		assert_eq!(parsed[0].as_ref().map(|item| item.episode), Some(Some(5)));
		assert_eq!(parsed[1].as_ref().map(|item| item.episode), Some(Some(6)));
	}

	#[test]
	fn parse_together_query_keeps_order() {
		let results = parse_together_query(&crate::types::ParseTogetherInput {
			inputs: vec![
				"Frieren (01-12) [Batch]/Frieren - 05 [1080p].mkv".into(),
				"Frieren (01-12) [Batch]/Frieren - 06 [1080p].mkv".into(),
			],
			ignored: None,
		});
		assert_eq!(results.len(), 2);
		assert_eq!(results[0].as_ref().map(|item| item.episode), Some(Some(5)));
		assert_eq!(results[1].as_ref().map(|item| item.episode), Some(Some(6)));
	}

	#[test]
	fn parse_together_single_input_matches_parse_for_bare_name() {
		let input = "[HorribleSubs] Show - 08 [1080p].mkv";
		let options = Options::default();
		assert_eq!(
			crate::anitomy::parse_together(&[input], options)
				.into_iter()
				.next()
				.unwrap_or_default(),
			crate::anitomy::parse(input, options)
		);
		assert_eq!(parse_path(input, options), crate::anitomy::parse(input, options));
	}

	#[test]
	fn parse_does_not_panic_on_edge_inputs() {
		let options = Options::default();
		let edges = [
			"",
			".",
			"..",
			"[]",
			"()",
			"[[[[[[",
			"----",
			"/////",
			r"C:\Users\weird\path.mkv",
			"S01E01S02E02S03E03",
		];
		for input in edges {
			let _ = std::panic::catch_unwind(|| crate::anitomy::parse(input, options))
				.unwrap_or_else(|_| panic!("parse panicked on {input:?}"));
			let _ = std::panic::catch_unwind(|| crate::anitomy::parse_together(&[input], options))
				.unwrap_or_else(|_| panic!("parse_together panicked on {input:?}"));
		}
		assert!(crate::anitomy::parse_together(&[], options).is_empty());
	}
}
