use super::shared::{
	browser_media_ok, choose_browser_title, classify_player, extract_file_path, pick_hit, process_key, query_mpv_json,
};
use crate::types::{NowPlaying, NowPlayingInput};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use windows::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM, MAX_PATH};
use windows::Win32::System::Threading::{
	OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::WindowsAndMessaging::{
	EnumWindows, GetClassNameW, GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
	IsWindowVisible,
};

struct RawWindow {
	hwnd: HWND,
	pid: u32,
	class: String,
	title: String,
	foreground: bool,
}

struct EnumCtx {
	fg: HWND,
	rows: Vec<RawWindow>,
}

fn wide_to_string(buf: &[u16], n: i32) -> String {
	if n <= 0 {
		return String::new();
	}
	String::from_utf16_lossy(&buf[..n as usize])
}

fn window_class(hwnd: HWND) -> String {
	let mut buf = [0u16; 256];
	let n = unsafe { GetClassNameW(hwnd, &mut buf) };
	wide_to_string(&buf, n)
}

fn window_title(hwnd: HWND) -> String {
	let len = unsafe { GetWindowTextLengthW(hwnd) };
	if len <= 0 {
		return String::new();
	}
	let mut buf = vec![0u16; len as usize + 1];
	let written = unsafe { GetWindowTextW(hwnd, &mut buf) };
	wide_to_string(&buf, written)
}

fn process_image_path(pid: u32) -> Option<String> {
	let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) }.ok()?;
	let mut buf = [0u16; MAX_PATH as usize];
	let mut size = buf.len() as u32;
	let ok = unsafe { QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, windows::core::PWSTR(buf.as_mut_ptr()), &mut size) };
	let _ = unsafe { CloseHandle(handle) };
	ok.ok()?;
	Some(String::from_utf16_lossy(&buf[..size as usize]))
}

fn cached_process_image_path(pid: u32) -> Option<String> {
	static CACHE: OnceLock<Mutex<HashMap<u32, (Instant, Option<String>)>>> = OnceLock::new();
	let mut cache = CACHE.get_or_init(|| Mutex::new(HashMap::new())).lock().ok()?;
	if let Some((at, value)) = cache.get(&pid) {
		if at.elapsed() < Duration::from_secs(8) {
			return value.clone();
		}
	}
	let value = process_image_path(pid);
	cache.retain(|_, (at, _)| at.elapsed() < Duration::from_secs(30));
	cache.insert(pid, (Instant::now(), value.clone()));
	value
}

fn exe_key(path: &str) -> String {
	process_key(
		Path::new(path)
			.file_name()
			.and_then(|name| name.to_str())
			.unwrap_or(path),
	)
}

fn is_browser_widget_class(class: &str) -> bool {
	class == "Chrome_WidgetWin_1" || class == "MozillaWindowClass"
}

unsafe extern "system" fn on_window(hwnd: HWND, lparam: LPARAM) -> BOOL {
	let ctx = unsafe { &mut *(lparam.0 as *mut EnumCtx) };
	if !unsafe { IsWindowVisible(hwnd) }.as_bool() {
		return true.into();
	}
	let class = window_class(hwnd);
	let title = window_title(hwnd);
	if title.trim().is_empty() && !is_browser_widget_class(&class) {
		return true.into();
	}
	let mut pid = 0u32;
	unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
	ctx.rows.push(RawWindow {
		hwnd,
		pid,
		class,
		title,
		foreground: hwnd == ctx.fg,
	});
	true.into()
}

fn query_mpv_pipe(name: &str) -> Option<String> {
	let file = std::fs::OpenOptions::new().read(true).write(true).open(name).ok()?;
	query_mpv_json(file)
}

fn mpv_ipc_path(pid: u32) -> Option<String> {
	static CACHE: OnceLock<Mutex<HashMap<u32, (Instant, Option<String>)>>> = OnceLock::new();
	let Ok(mut cache) = CACHE.get_or_init(|| Mutex::new(HashMap::new())).lock() else {
		return query_mpv_ipc(pid);
	};
	if let Some((at, value)) = cache.get(&pid) {
		if at.elapsed() < Duration::from_secs(2) {
			return value.clone();
		}
	}
	let value = query_mpv_ipc(pid);
	cache.retain(|_, (at, _)| at.elapsed() < Duration::from_secs(10));
	cache.insert(pid, (Instant::now(), value.clone()));
	value
}

fn query_mpv_ipc(pid: u32) -> Option<String> {
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

pub fn now_playing(input: NowPlayingInput) -> Option<NowPlaying> {
	let mut ctx = EnumCtx {
		fg: unsafe { GetForegroundWindow() },
		rows: Vec::new(),
	};
	unsafe {
		let _ = EnumWindows(Some(on_window), LPARAM(&mut ctx as *mut EnumCtx as isize));
	}

	let preferred = input.preferred_window_id.as_deref();
	let mut hits: Vec<NowPlaying> = Vec::new();
	for row in ctx.rows {
		let Some(image) = cached_process_image_path(row.pid) else {
			continue;
		};
		let name = exe_key(&image);
		let Some((key, is_browser)) = classify_player(&name, &input) else {
			continue;
		};
		if is_browser && !is_browser_widget_class(&row.class) {
			continue;
		}
		if is_browser && row.title.trim().is_empty() && !row.foreground {
			continue;
		}
		if is_browser && !browser_media_ok(&row.title, None, &[], &input) {
			continue;
		}
		let title = if is_browser {
			choose_browser_title(&row.title, &[], &input)
		} else if row.title.trim().is_empty() {
			None
		} else {
			Some(row.title.clone())
		};
		let from_title = title.as_deref().and_then(extract_file_path);
		let file_path = if is_browser {
			None
		} else {
			from_title.or_else(|| {
				if key.contains("mpv") {
					mpv_ipc_path(row.pid)
				} else {
					None
				}
			})
		};
		hits.push(NowPlaying {
			player: key,
			window_id: (row.hwnd.0 as isize).to_string(),
			title,
			file_path,
			url: None,
			foreground: row.foreground,
			browser: Some(is_browser),
		});
	}
	pick_hit(hits, preferred)
}
