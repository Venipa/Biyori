use crate::types::{NowPlaying, NowPlayingInput};
use std::io::{BufRead, BufReader, Read, Write};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

pub const VIDEO_EXT: &[&str] = &[
	"mkv", "mp4", "avi", "webm", "mov", "wmv", "flv", "ts", "m2ts", "mpg", "mpeg",
];

pub fn process_key(name: &str) -> String {
	name.to_ascii_lowercase()
		.trim_end_matches(".exe")
		.to_string()
}

fn is_ignored_host(key: &str) -> bool {
	key == "teams" || key.starts_with("ms-teams") || key == "applicationframehost"
}

fn process_matches(key: &str, want: &str) -> bool {
	if want.is_empty() {
		return false;
	}
	if key == want {
		return true;
	}
	let Some(rest) = key.strip_prefix(want) else {
		return false;
	};
	!rest.is_empty() && rest.chars().all(|ch| ch.is_ascii_digit() || ch == '-' || ch == '_')
}

pub fn name_allowed(process: &str, allowed: &[String]) -> bool {
	let key = process_key(process);
	if is_ignored_host(&key) {
		return false;
	}
	allowed.iter().any(|item| process_matches(&key, &process_key(item)))
}

pub fn classify_player(name: &str, input: &NowPlayingInput) -> Option<(String, bool)> {
	let key = process_key(name);
	if is_ignored_host(&key) {
		return None;
	}
	let browsers = input.browser_names.as_deref().unwrap_or(&[]);
	if key.contains("webview") {
		if browsers.is_empty() {
			return None;
		}
		return Some(("msedge".into(), true));
	}
	if !name_allowed(name, &input.process_names) {
		return None;
	}
	let is_browser = browsers.iter().any(|item| key == process_key(item));
	Some((key, is_browser))
}

pub fn haystack_matches(haystack: &str, needles: &[String]) -> bool {
	let lower = haystack.to_ascii_lowercase();
	needles
		.iter()
		.any(|needle| !needle.is_empty() && lower.contains(&needle.to_ascii_lowercase()))
}

pub fn looks_like_playback_title(title: &str) -> bool {
	let t = title.trim();
	if t.len() < 8 {
		return false;
	}
	static RE: std::sync::OnceLock<regex::Regex> = std::sync::OnceLock::new();
	let re = RE.get_or_init(|| {
		regex::RegexBuilder::new(r"S[0-9]+\s*:\s*E[0-9]+|S[0-9]+E[0-9]+|Episode\s+[0-9]+")
			.case_insensitive(true)
			.unicode(false)
			.build()
			.expect("playback title regex")
	});
	re.is_match(t)
}

fn url_matches_patterns(url: &str, patterns: &[String]) -> bool {
	patterns.iter().any(|pattern| {
		if pattern.is_empty() {
			return false;
		}
		regex::RegexBuilder::new(pattern)
			.case_insensitive(true)
			.unicode(false)
			.build()
			.ok()
			.is_some_and(|re| re.is_match(url))
	})
}

pub fn browser_title_ok(title: &str, input: &NowPlayingInput) -> bool {
	haystack_matches(title, input.title_needles.as_deref().unwrap_or(&[]))
}

pub fn browser_media_ok(title: &str, url: Option<&str>, tabs: &[String], input: &NowPlayingInput) -> bool {
	let needles = input.title_needles.as_deref().unwrap_or(&[]);
	let patterns = input.url_patterns.as_deref().unwrap_or(&[]);
	if needles.is_empty() && patterns.is_empty() {
		return false;
	}
	if !needles.is_empty() && browser_title_ok(title, input) {
		return true;
	}
	if let Some(url) = url {
		if !needles.is_empty() && haystack_matches(url, needles) {
			return true;
		}
		if url_matches_patterns(url, patterns) {
			return true;
		}
	}
	if !needles.is_empty() && tabs.iter().any(|tab| haystack_matches(tab, needles)) {
		return true;
	}
	if looks_like_playback_title(title) || tabs.iter().any(|tab| looks_like_playback_title(tab)) {
		return true;
	}
	false
}

pub fn pick_hit(hits: Vec<NowPlaying>, preferred: Option<&str>) -> Option<NowPlaying> {
	if let Some(preferred) = preferred {
		if let Some(hit) = hits.iter().find(|item| item.window_id == preferred) {
			return Some(hit.clone());
		}
	}
	if let Some(hit) = hits.iter().find(|item| item.browser != Some(true) && item.file_path.is_some()) {
		return Some(hit.clone());
	}
	if let Some(hit) = hits.iter().find(|item| item.browser == Some(true) && item.foreground) {
		return Some(hit.clone());
	}
	if let Some(hit) = hits.iter().find(|item| item.browser == Some(true)) {
		return Some(hit.clone());
	}
	if let Some(hit) = hits.iter().find(|item| item.browser != Some(true)) {
		return Some(hit.clone());
	}
	hits.into_iter().next()
}

const BROWSER_TITLE_JUNK: &[&str] = &[
	"blank page",
	"inprivate",
	"new tab",
	"private browsing",
	"problem loading page",
	"speed dial",
	"untitled",
	"google chrome",
	"microsoft edge",
	"mozilla firefox",
];

const BROWSER_TITLE_SUFFIXES: &[&str] = &[
	" - audio muted",
	" - audio playing",
	" - google chrome",
	" - microsoft edge",
	" - mozilla firefox",
	" - zen",
	" - brave",
	" - opera",
	" - chromium",
	" - helium",
	" | netflix",
	" - netflix",
	" | youtube",
	" - youtube",
	" | crunchyroll",
	" - crunchyroll",
	" | plex",
	" - plex",
	" | jellyfin",
	" - jellyfin",
];

pub fn normalize_browser_title(title: &str) -> String {
	let mut out = title.trim().to_string();
	let lower = out.to_ascii_lowercase();
	if lower.starts_with("http://") || lower.starts_with("https://") {
		return String::new();
	}
	loop {
		let current = out.to_ascii_lowercase();
		let mut cut = None;
		for suffix in BROWSER_TITLE_SUFFIXES {
			if current.ends_with(suffix) {
				cut = Some(out.len() - suffix.len());
				break;
			}
		}
		let Some(end) = cut else {
			break;
		};
		out.truncate(end);
		out = out.trim_end().to_string();
	}
	if BROWSER_TITLE_JUNK.contains(&out.to_ascii_lowercase().as_str()) {
		return String::new();
	}
	out
}

pub fn is_brand_only_title(title: &str, needles: &[String]) -> bool {
	let t = title.trim();
	if t.is_empty() {
		return true;
	}
	needles.iter().any(|needle| t.eq_ignore_ascii_case(needle))
}

pub fn is_noise_ui_label(title: &str) -> bool {
	const NOISE: &[&str] = &[
		"audio & subtitles",
		"back",
		"episodes",
		"exit full screen",
		"full screen",
		"games",
		"home",
		"kids",
		"more info",
		"movies",
		"my list",
		"next episode",
		"pause",
		"play",
		"play something",
		"search",
		"series",
		"skip intro",
		"skip recap",
		"trailers & more",
		"tv shows",
	];
	let t = title.trim().to_ascii_lowercase();
	if t.is_empty() || t.len() < 3 || t.len() > 120 {
		return true;
	}
	if t.split_whitespace().count() > 16 {
		return true;
	}
	NOISE.iter().any(|item| t == *item)
}

pub fn looks_like_spoken_line(title: &str) -> bool {
	let t = title.trim();
	t.ends_with('.')
		|| t.ends_with('!')
		|| t.ends_with('?')
		|| t.ends_with('。')
		|| t.ends_with('！')
		|| t.ends_with('？')
}

pub fn choose_browser_title(caption: &str, tabs: &[String], input: &NowPlayingInput) -> Option<String> {
	let needles = input.title_needles.as_deref().unwrap_or(&[]);
	let mut candidates: Vec<String> = Vec::new();
	for raw in std::iter::once(caption).chain(tabs.iter().map(String::as_str)) {
		let n = normalize_browser_title(raw);
		if n.is_empty() || is_brand_only_title(&n, needles) || is_noise_ui_label(&n) || looks_like_spoken_line(&n) {
			continue;
		}
		if !candidates.iter().any(|item| item.eq_ignore_ascii_case(&n)) {
			candidates.push(n);
		}
	}
	if let Some(hit) = candidates.iter().find(|item| looks_like_playback_title(item)) {
		return Some(hit.clone());
	}
	candidates
		.iter()
		.filter(|item| item.split_whitespace().count() <= 8)
		.max_by_key(|item| item.len())
		.cloned()
		.or_else(|| candidates.into_iter().max_by_key(|item| item.len()))
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn browser_needs_tree_probe(caption: &str, foreground: bool, preferred: bool, input: &NowPlayingInput) -> bool {
	if choose_browser_title(caption, &[], input).is_some() {
		return false;
	}
	foreground || preferred
}

pub fn normalize_media_path(value: &str) -> String {
	let trimmed = value.trim();
	if let Some(rest) = trimmed.strip_prefix("file:///") {
		#[cfg(windows)]
		{
			return rest.replace('/', "\\");
		}
		#[cfg(not(windows))]
		{
			return format!("/{rest}");
		}
	}
	if let Some(rest) = trimmed.strip_prefix("file://") {
		return rest.to_string();
	}
	trimmed.to_string()
}

pub fn query_mpv_json<S>(stream: S) -> Option<String>
where
	S: Read + Write + Send + 'static,
{
	let mut stream = stream;
	stream.write_all(b"{\"command\":[\"get_property\",\"path\"]}\n").ok()?;
	let (tx, rx) = mpsc::channel();
	thread::spawn(move || {
		let mut line = String::new();
		let _ = BufReader::new(stream).read_line(&mut line);
		let _ = tx.send(line);
	});
	let line = rx.recv_timeout(Duration::from_millis(250)).ok()?;
	let value: serde_json::Value = serde_json::from_str(&line).ok()?;
	if value.get("error").and_then(|item| item.as_str()) != Some("success") {
		return None;
	}
	value
		.get("data")
		.and_then(|item| item.as_str())
		.filter(|item| !item.is_empty())
		.map(normalize_media_path)
}

#[cfg_attr(not(unix), allow(dead_code))]
pub fn file_path_from_cmd(cmd: &[impl AsRef<std::ffi::OsStr>]) -> Option<String> {
	for arg in cmd.iter().skip(1) {
		let s = arg.as_ref().to_string_lossy();
		if s.starts_with('-') {
			continue;
		}
		let lower = s.to_ascii_lowercase();
		if VIDEO_EXT.iter().any(|ext| lower.ends_with(&format!(".{ext}"))) {
			return Some(normalize_media_path(&s));
		}
	}
	None
}

fn is_path_char(ch: char) -> bool {
	ch != ':' && ch != '*' && ch != '?' && ch != '"' && ch != '<' && ch != '>' && ch != '|' && ch != '\n'
}

pub fn extract_file_path(title: &str) -> Option<String> {
	let lower = title.to_ascii_lowercase();
	let mut end: Option<usize> = None;
	for ext in VIDEO_EXT {
		let needle = format!(".{ext}");
		if let Some(idx) = lower.rfind(&needle) {
			let stop = idx + needle.len();
			if end.map(|cur| stop > cur).unwrap_or(true) {
				end = Some(stop);
			}
		}
	}
	let end = end?;
	let prefix = &title[..end];
	if let Some(idx) = prefix.rfind(":\\") {
		if idx > 0 {
			let start = idx - 1;
			if prefix.as_bytes().get(start).is_some_and(|b| b.is_ascii_alphabetic()) {
				return Some(prefix[start..].to_string());
			}
		}
	}
	if let Some(idx) = prefix.rfind("\\\\") {
		return Some(prefix[idx..].to_string());
	}
	if let Some(idx) = prefix.rfind('/') {
		let start = prefix[..idx].rfind(|ch: char| !is_path_char(ch)).map(|i| i + 1).unwrap_or(0);
		let path = &prefix[start..];
		if path.starts_with('/') {
			return Some(path.to_string());
		}
	}
	None
}

#[cfg(unix)]
pub fn unix_mpv_paths(pid: u32) -> Vec<std::path::PathBuf> {
	use std::path::PathBuf;
	let mut paths = vec![
		PathBuf::from(format!("/tmp/mpv-{pid}")),
		PathBuf::from("/tmp/mpv-socket"),
	];
	if let Some(home) = std::env::var_os("HOME") {
		paths.push(PathBuf::from(home).join("Library/Application Support/mpv/socket"));
	}
	if let Ok(xdg) = std::env::var("XDG_RUNTIME_DIR") {
		let dir = PathBuf::from(xdg);
		paths.push(dir.join("mpv"));
		paths.push(dir.join(format!("mpv-{pid}")));
	}
	paths
}

#[cfg(unix)]
pub fn query_unix_mpv(pid: u32) -> Option<String> {
	use std::os::unix::net::UnixStream;
	for path in unix_mpv_paths(pid) {
		let Ok(stream) = UnixStream::connect(&path) else {
			continue;
		};
		let _ = stream.set_read_timeout(Some(Duration::from_millis(250)));
		let _ = stream.set_write_timeout(Some(Duration::from_millis(250)));
		if let Some(media) = query_mpv_json(stream) {
			return Some(media);
		}
	}
	None
}

#[cfg(test)]
mod tests {
	use super::{
		browser_media_ok, browser_needs_tree_probe, choose_browser_title, extract_file_path, file_path_from_cmd,
		looks_like_playback_title, name_allowed, normalize_browser_title, pick_hit,
	};
	use crate::types::{NowPlaying, NowPlayingInput};

	fn np(window_id: &str, browser: bool, foreground: bool, file: Option<&str>) -> NowPlaying {
		NowPlaying {
			player: "p".into(),
			window_id: window_id.into(),
			title: Some("t".into()),
			file_path: file.map(str::to_string),
			url: None,
			foreground,
			browser: Some(browser),
		}
	}

	fn input_needles(needles: &[&str]) -> NowPlayingInput {
		NowPlayingInput {
			process_names: vec![],
			browser_names: None,
			title_needles: Some(needles.iter().map(|item| item.to_string()).collect()),
			url_patterns: None,
			preferred_window_id: None,
		}
	}

	#[test]
	fn extracts_windows_path_from_title() {
		let title = r"D:\Anime\Show\05.mkv - mpv.net";
		assert_eq!(extract_file_path(title).as_deref(), Some(r"D:\Anime\Show\05.mkv"));
	}

	#[test]
	fn extracts_unix_path_from_title() {
		let title = "/home/user/anime/Show/05.mkv - mpv";
		assert_eq!(
			extract_file_path(title).as_deref(),
			Some("/home/user/anime/Show/05.mkv")
		);
	}

	#[test]
	fn file_path_from_cmd_skips_flags() {
		let cmd = ["mpv", "--force-window", "/home/user/show.mkv"];
		assert_eq!(file_path_from_cmd(&cmd).as_deref(), Some("/home/user/show.mkv"));
	}

	#[cfg(unix)]
	#[test]
	fn unix_mpv_paths_include_pid() {
		let paths = super::unix_mpv_paths(42);
		assert!(paths.iter().any(|path| path.to_string_lossy().contains("42")));
	}

	#[test]
	fn strips_chrome_caption_affixes() {
		assert_eq!(
			normalize_browser_title("Show - Crunchyroll - Google Chrome"),
			"Show"
		);
		assert_eq!(normalize_browser_title("New Tab"), "");
	}

	#[test]
	fn prefers_matching_tab_over_generic_caption() {
		let input = input_needles(&["Crunchyroll"]);
		assert_eq!(
			choose_browser_title("Google Chrome", &["Show - Crunchyroll".into()], &input).as_deref(),
			Some("Show")
		);
	}

	#[test]
	fn skips_netflix_brand_caption_for_show_name() {
		let input = input_needles(&["Netflix"]);
		assert_eq!(choose_browser_title("Netflix", &[], &input), None);
		assert_eq!(
			choose_browser_title("Netflix", &["Jujutsu Kaisen".into()], &input).as_deref(),
			Some("Jujutsu Kaisen")
		);
		assert_eq!(
			choose_browser_title(
				"Netflix",
				&["Jujutsu Kaisen".into(), "I'm going to be okay.".into()],
				&input
			)
			.as_deref(),
			Some("Jujutsu Kaisen")
		);
		assert_eq!(
			normalize_browser_title("Jujutsu Kaisen - Netflix"),
			"Jujutsu Kaisen"
		);
	}

	#[test]
	fn webview2_is_edge_when_browsers_enabled() {
		let mut input = input_needles(&["Netflix"]);
		input.process_names = vec!["chrome".into(), "msedge".into()];
		input.browser_names = Some(vec!["chrome".into(), "msedge".into()]);
		assert_eq!(super::classify_player("msedgewebview2.exe", &input), Some(("msedge".into(), true)));
		assert_eq!(super::classify_player("Teams.exe", &input), None);
	}

	#[test]
	fn pick_hit_prefers_sticky_then_local_file_then_foreground_browser() {
		let hits = vec![
			np("1", true, false, None),
			np("2", true, true, None),
			np("3", false, false, Some(r"D:\a.mkv")),
		];
		assert_eq!(pick_hit(hits.clone(), Some("1")).unwrap().window_id, "1");
		assert_eq!(pick_hit(hits.clone(), None).unwrap().window_id, "3");
		let browsers = vec![np("1", true, false, None), np("2", true, true, None)];
		assert_eq!(pick_hit(browsers, None).unwrap().window_id, "2");
	}

	#[test]
	fn ignores_teams_webview_and_keeps_edge64() {
		let allowed = vec!["msedge".into(), "mpc-hc".into(), "chrome".into()];
		assert!(!name_allowed("msedgewebview2.exe", &allowed));
		assert!(!name_allowed("Teams.exe", &allowed));
		assert!(name_allowed("msedge.exe", &allowed));
		assert!(name_allowed("mpc-hc64.exe", &allowed));
		assert!(!name_allowed("chromium.exe", &allowed));
	}

	#[test]
	fn jellyfin_web_title_without_brand_is_playback() {
		let title = "HELL MODE: The Hardcore Gamer Dominates in Another World with Garbage Balancing - S1:E8 - Episode 8 (2026)";
		assert!(looks_like_playback_title(title));
		let input = input_needles(&["Jellyfin"]);
		assert!(browser_media_ok(title, None, &[], &input));
		assert!(!browser_media_ok("Inbox - Gmail", None, &[], &input));
	}

	#[test]
	fn tree_probe_skips_when_caption_already_has_a_show_title() {
		let input = input_needles(&["Crunchyroll"]);
		assert!(!browser_needs_tree_probe("Show - Crunchyroll", false, false, &input));
		assert!(browser_needs_tree_probe("Netflix", true, false, &input_needles(&["Netflix"])));
		assert!(!browser_needs_tree_probe("Netflix", false, false, &input_needles(&["Netflix"])));
		assert!(browser_needs_tree_probe("Netflix", false, true, &input_needles(&["Netflix"])));
	}

	#[test]
	fn jellyfin_url_pattern_matches_lan_portal() {
		let mut input = input_needles(&["Jellyfin"]);
		input.url_patterns = Some(vec!["jellyfin|:8096|/web/#/".into()]);
		assert!(browser_media_ok(
			"Home",
			Some("http://192.168.1.10:8096/web/#/video"),
			&[],
			&input
		));
	}
}
