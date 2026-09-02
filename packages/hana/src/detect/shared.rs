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

pub fn name_allowed(process: &str, allowed: &[String]) -> bool {
	let key = process_key(process);
	allowed.iter().any(|item| {
		let want = process_key(item);
		!want.is_empty() && (key == want || key.contains(&want))
	})
}

pub fn classify_player(name: &str, input: &NowPlayingInput) -> Option<(String, bool)> {
	if !name_allowed(name, &input.process_names) {
		return None;
	}
	let key = process_key(name);
	let browsers = input.browser_names.as_deref().unwrap_or(&[]);
	let is_browser = browsers.iter().any(|item| key == process_key(item));
	Some((key, is_browser))
}

pub fn browser_title_ok(title: &str, input: &NowPlayingInput) -> bool {
	let needles = input.title_needles.as_deref().unwrap_or(&[]);
	let title_l = title.to_ascii_lowercase();
	needles
		.iter()
		.any(|needle| !needle.is_empty() && title_l.contains(&needle.to_ascii_lowercase()))
}

pub fn pick_hit(hits: Vec<NowPlaying>, preferred: Option<&str>) -> Option<NowPlaying> {
	if let Some(preferred) = preferred {
		if let Some(hit) = hits.iter().find(|item| item.window_id == preferred) {
			return Some(hit.clone());
		}
	}
	if let Some(hit) = hits.iter().find(|item| item.browser != Some(true)) {
		return Some(hit.clone());
	}
	hits.into_iter().next()
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
	use super::{extract_file_path, file_path_from_cmd};

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
}
