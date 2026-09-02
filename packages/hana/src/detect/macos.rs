use super::shared::{
	browser_title_ok, classify_player, extract_file_path, file_path_from_cmd, pick_hit, query_unix_mpv,
};
use crate::types::{NowPlaying, NowPlayingInput};
use core_foundation::base::{CFType, TCFType};
use core_foundation::dictionary::CFDictionary;
use core_foundation::number::CFNumber;
use core_foundation::string::{CFString, CFStringRef};
use core_graphics::window::{
	copy_window_info, kCGNullWindowID, kCGWindowLayer, kCGWindowListExcludeDesktopElements,
	kCGWindowListOptionOnScreenOnly, kCGWindowName, kCGWindowNumber, kCGWindowOwnerPID,
};
use std::collections::HashSet;
use std::ffi::c_void;
use sysinfo::{ProcessesToUpdate, System};

fn dict_i64(dict: &CFDictionary<CFString, CFType>, key: CFStringRef) -> Option<i64> {
	let key = unsafe { CFString::wrap_under_get_rule(key) };
	let value = dict.find(&key)?;
	value.downcast::<CFNumber>()?.to_i64()
}

fn dict_string(dict: &CFDictionary<CFString, CFType>, key: CFStringRef) -> Option<String> {
	let key = unsafe { CFString::wrap_under_get_rule(key) };
	let value = dict.find(&key)?;
	Some(value.downcast::<CFString>()?.to_string())
}

struct MacWindow {
	id: i64,
	pid: u32,
	title: String,
	foreground: bool,
}

fn list_windows() -> Vec<MacWindow> {
	let options = kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements;
	let Some(info) = copy_window_info(options, kCGNullWindowID) else {
		return Vec::new();
	};
	let mut rows = Vec::new();
	let mut fg_id: Option<i64> = None;
	for entry in info.iter() {
		let dict: CFDictionary<CFString, CFType> =
			unsafe { TCFType::wrap_under_get_rule(*entry as *const c_void as *const _) };
		let Some(id) = dict_i64(&dict, unsafe { kCGWindowNumber }) else {
			continue;
		};
		let Some(pid) = dict_i64(&dict, unsafe { kCGWindowOwnerPID }) else {
			continue;
		};
		let title = dict_string(&dict, unsafe { kCGWindowName }).unwrap_or_default();
		if title.trim().is_empty() {
			continue;
		}
		let layer = dict_i64(&dict, unsafe { kCGWindowLayer }).unwrap_or(1);
		if fg_id.is_none() && layer == 0 {
			fg_id = Some(id);
		}
		rows.push(MacWindow {
			id,
			pid: pid as u32,
			title,
			foreground: false,
		});
	}
	if let Some(fg) = fg_id {
		for row in &mut rows {
			row.foreground = row.id == fg;
		}
	}
	rows
}

pub fn now_playing(input: NowPlayingInput) -> Option<NowPlaying> {
	let mut sys = System::new();
	sys.refresh_processes(ProcessesToUpdate::All, true);
	let mut hits: Vec<NowPlaying> = Vec::new();
	let mut seen: HashSet<u32> = HashSet::new();
	for row in list_windows() {
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
		seen.insert(row.pid);
		let ipc = if key.contains("mpv") {
			query_unix_mpv(row.pid)
		} else {
			None
		};
		let file_path = if is_browser {
			None
		} else {
			ipc.or_else(|| extract_file_path(&row.title))
				.or_else(|| file_path_from_cmd(proc.cmd()))
		};
		hits.push(NowPlaying {
			player: key,
			window_id: row.id.to_string(),
			title: Some(row.title),
			file_path,
			url: None,
			foreground: row.foreground,
			browser: Some(is_browser),
		});
	}
	for (pid, proc) in sys.processes() {
		let pid_u32 = pid.as_u32();
		if seen.contains(&pid_u32) {
			continue;
		}
		let name = proc.name().to_string_lossy().to_string();
		let Some((key, is_browser)) = classify_player(&name, &input) else {
			continue;
		};
		if is_browser {
			continue;
		}
		let ipc = if key.contains("mpv") {
			query_unix_mpv(pid_u32)
		} else {
			None
		};
		let file_path = ipc.or_else(|| file_path_from_cmd(proc.cmd()));
		hits.push(NowPlaying {
			player: key,
			window_id: pid_u32.to_string(),
			title: None,
			file_path,
			url: None,
			foreground: false,
			browser: Some(false),
		});
	}
	pick_hit(hits, input.preferred_window_id.as_deref())
}

#[cfg(test)]
mod tests {
	use super::super::shared::unix_mpv_paths;

	#[test]
	fn macos_mpv_paths_include_app_support() {
		let paths = unix_mpv_paths(9);
		assert!(paths
			.iter()
			.any(|path| path.to_string_lossy().contains("Application Support/mpv/socket")
				|| path.to_string_lossy().contains("mpv-9")));
	}
}
