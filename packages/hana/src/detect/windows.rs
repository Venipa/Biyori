use super::shared::{browser_title_ok, classify_player, extract_file_path, pick_hit, query_mpv_json};
use crate::types::{NowPlaying, NowPlayingInput};
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

fn query_mpv_pipe(name: &str) -> Option<String> {
	let file = std::fs::OpenOptions::new().read(true).write(true).open(name).ok()?;
	query_mpv_json(file)
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

pub fn now_playing(input: NowPlayingInput) -> Option<NowPlaying> {
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
		let Some((key, is_browser)) = classify_player(&name, &input) else {
			continue;
		};
		if is_browser && !browser_title_ok(&row.title, &input) {
			continue;
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
	pick_hit(hits, input.preferred_window_id.as_deref())
}
