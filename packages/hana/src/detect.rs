use crate::types::{NowPlaying, NowPlayingInput};
use std::io::{BufRead, BufReader, Write};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

const VIDEO_EXT: &[&str] = &[
	"mkv", "mp4", "avi", "webm", "mov", "wmv", "flv", "ts", "m2ts", "mpg", "mpeg",
];

fn process_key(name: &str) -> String {
	name.to_ascii_lowercase()
		.trim_end_matches(".exe")
		.to_string()
}

fn name_allowed(process: &str, allowed: &[String]) -> bool {
	let key = process_key(process);
	allowed.iter().any(|item| {
		let want = process_key(item);
		!want.is_empty() && (key == want || key.contains(&want))
	})
}

fn normalize_media_path(value: &str) -> String {
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

fn query_mpv_pipe(name: &str) -> Option<String> {
	let mut file = std::fs::OpenOptions::new().read(true).write(true).open(name).ok()?;
	file.write_all(b"{\"command\":[\"get_property\",\"path\"]}\n").ok()?;
	let (tx, rx) = mpsc::channel();
	thread::spawn(move || {
		let mut line = String::new();
		let _ = BufReader::new(file).read_line(&mut line);
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

fn mpv_ipc_path(pid: u32) -> Option<String> {
	let names = [
		format!(r"\\.\pipe\mpvnet-{pid}"),
		format!(r"\\.\pipe\mpv-{pid}"),
		r"\\.\pipe\mpvnet".to_string(),
		r"\\.\pipe\mpv-pipe".to_string(),
		r"\\.\pipe\mpvsocket".to_string(),
		r"\\.\pipe\mpvpipe".to_string(),
	];
	for name in names {
		if let Some(path) = query_mpv_pipe(&name) {
			return Some(path);
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

#[cfg(windows)]
pub fn now_playing(input: NowPlayingInput) -> Option<NowPlaying> {
	windows_now_playing(input)
}

#[cfg(not(windows))]
pub fn now_playing(_input: NowPlayingInput) -> Option<NowPlaying> {
	None
}

#[cfg(windows)]
fn windows_now_playing(input: NowPlayingInput) -> Option<NowPlaying> {
	use sysinfo::{ProcessesToUpdate, System};
	use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
	use windows::Win32::UI::WindowsAndMessaging::{
		EnumWindows, GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible,
	};

	struct RawWindow {
		hwnd: isize,
		pid: u32,
		title: String,
		foreground: bool,
	}

	struct EnumCtx {
		fg: HWND,
		rows: Vec<RawWindow>,
	}

	unsafe extern "system" fn on_window(hwnd: HWND, lparam: LPARAM) -> BOOL {
		let ctx = unsafe { &mut *(lparam.0 as *mut EnumCtx) };
		if !unsafe { IsWindowVisible(hwnd) }.as_bool() {
			return true.into();
		}
		let len = unsafe { GetWindowTextLengthW(hwnd) };
		if len <= 0 {
			return true.into();
		}
		let mut buf = vec![0u16; len as usize + 1];
		let written = unsafe { GetWindowTextW(hwnd, &mut buf) };
		if written <= 0 {
			return true.into();
		}
		let title = String::from_utf16_lossy(&buf[..written as usize]);
		if title.trim().is_empty() {
			return true.into();
		}
		let mut pid = 0u32;
		unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
		ctx.rows.push(RawWindow {
			hwnd: hwnd.0 as isize,
			pid,
			title,
			foreground: hwnd == ctx.fg,
		});
		true.into()
	}

	let mut ctx = EnumCtx {
		fg: unsafe { GetForegroundWindow() },
		rows: Vec::new(),
	};
	unsafe {
		let _ = EnumWindows(Some(on_window), LPARAM(&mut ctx as *mut EnumCtx as isize));
	}

	let mut sys = System::new();
	sys.refresh_processes(ProcessesToUpdate::All, true);
	let mut hits: Vec<NowPlaying> = Vec::new();
	for row in ctx.rows {
		let Some(proc) = sys.process(sysinfo::Pid::from_u32(row.pid)) else {
			continue;
		};
		let name = proc.name().to_string_lossy().to_string();
		if !name_allowed(&name, &input.process_names) {
			continue;
		}
		let key = process_key(&name);
		let browsers = input.browser_names.as_deref().unwrap_or(&[]);
		let needles = input.title_needles.as_deref().unwrap_or(&[]);
		let is_browser = browsers.iter().any(|item| key == process_key(item));
		if is_browser {
			let title_l = row.title.to_ascii_lowercase();
			let ok = needles
				.iter()
				.any(|needle| !needle.is_empty() && title_l.contains(&needle.to_ascii_lowercase()));
			if !ok {
				continue;
			}
		}
		let ipc = if key.contains("mpv") {
			mpv_ipc_path(row.pid)
		} else {
			None
		};
		let file_path = if is_browser {
			None
		} else {
			ipc.or_else(|| extract_file_path(&row.title))
		};
		hits.push(NowPlaying {
			player: key,
			window_id: row.hwnd.to_string(),
			title: Some(row.title),
			file_path,
			url: None,
			foreground: row.foreground,
			browser: Some(is_browser),
		});
	}
	if let Some(preferred) = input.preferred_window_id.as_deref() {
		if let Some(hit) = hits.iter().find(|item| item.window_id == preferred) {
			return Some(hit.clone());
		}
	}
	if let Some(hit) = hits.iter().find(|item| item.browser != Some(true)) {
		return Some(hit.clone());
	}
	hits.into_iter().next()
}

#[cfg(test)]
mod tests {
	use super::extract_file_path;

	#[test]
	fn extracts_windows_path_from_title() {
		let title = r"D:\Anime\Show\05.mkv - mpv.net";
		assert_eq!(extract_file_path(title).as_deref(), Some(r"D:\Anime\Show\05.mkv"));
	}
}
