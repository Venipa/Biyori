use super::shared::{
	browser_media_ok, choose_browser_title, classify_player, extract_file_path, pick_hit, process_key, query_mpv_json,
};
use crate::types::{NowPlaying, NowPlayingInput};
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use windows::core::{Interface, BSTR, VARIANT};
use windows::Media::Control::{
	GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager,
	GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM, MAX_PATH};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, COINIT_MULTITHREADED};
use windows::Win32::System::Threading::{
	OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::Accessibility::{
	CUIAutomation, IUIAutomation, IUIAutomationElement, IUIAutomationValuePattern, TreeScope_Descendants,
	UIA_ControlTypePropertyId, UIA_DocumentControlTypeId, UIA_EditControlTypeId, UIA_HeaderControlTypeId,
	UIA_TabItemControlTypeId, UIA_ValuePatternId,
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

fn looks_like_url(value: &str) -> bool {
	let v = value.trim();
	if v.is_empty() {
		return false;
	}
	let lower = v.to_ascii_lowercase();
	lower.starts_with("http://")
		|| lower.starts_with("https://")
		|| lower.contains(".com/")
		|| lower.contains(".tv/")
		|| lower.contains("localhost")
}

fn uia_collect(hwnd: HWND) -> (Option<String>, Vec<String>) {
	unsafe {
		let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
		let automation: IUIAutomation = match CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER) {
			Ok(item) => item,
			Err(_) => return (None, Vec::new()),
		};
		let root: IUIAutomationElement = match automation.ElementFromHandle(hwnd) {
			Ok(item) => item,
			Err(_) => return (None, Vec::new()),
		};
		let mut tabs = uia_names_of_type(&automation, &root, UIA_TabItemControlTypeId.0);
		tabs.extend(uia_names_of_type(&automation, &root, UIA_HeaderControlTypeId.0));
		tabs.extend(uia_names_of_type(&automation, &root, UIA_DocumentControlTypeId.0));
		let edits = uia_values_of_type(&automation, &root, UIA_EditControlTypeId.0);
		let url = edits.into_iter().find(|item| looks_like_url(item));
		(url, tabs)
	}
}

unsafe fn uia_condition(automation: &IUIAutomation, control_type: i32) -> Option<windows::Win32::UI::Accessibility::IUIAutomationCondition> {
	let value = VARIANT::from(control_type);
	automation.CreatePropertyCondition(UIA_ControlTypePropertyId, &value).ok()
}

unsafe fn uia_names_of_type(automation: &IUIAutomation, root: &IUIAutomationElement, control_type: i32) -> Vec<String> {
	let Some(condition) = uia_condition(automation, control_type) else {
		return Vec::new();
	};
	let Ok(array) = root.FindAll(TreeScope_Descendants, &condition) else {
		return Vec::new();
	};
	let Ok(len) = array.Length() else {
		return Vec::new();
	};
	let mut out = Vec::new();
	for i in 0..len.min(32) {
		let Ok(el) = array.GetElement(i) else {
			continue;
		};
		let Ok(name) = el.CurrentName() else {
			continue;
		};
		let text = bstr_to_string(name);
		if !text.is_empty() {
			out.push(text);
		}
	}
	out
}

unsafe fn uia_values_of_type(automation: &IUIAutomation, root: &IUIAutomationElement, control_type: i32) -> Vec<String> {
	let Some(condition) = uia_condition(automation, control_type) else {
		return Vec::new();
	};
	let Ok(array) = root.FindAll(TreeScope_Descendants, &condition) else {
		return Vec::new();
	};
	let Ok(len) = array.Length() else {
		return Vec::new();
	};
	let mut out = Vec::new();
	for i in 0..len.min(16) {
		let Ok(el) = array.GetElement(i) else {
			continue;
		};
		if let Some(text) = uia_value(&el) {
			if !text.is_empty() {
				out.push(text);
			}
		}
	}
	out
}

unsafe fn uia_value(el: &IUIAutomationElement) -> Option<String> {
	let pattern = el.GetCurrentPattern(UIA_ValuePatternId).ok()?;
	let value: IUIAutomationValuePattern = pattern.cast().ok()?;
	let bstr = value.CurrentValue().ok()?;
	Some(bstr_to_string(bstr))
}

fn bstr_to_string(value: BSTR) -> String {
	value.to_string()
}

fn smtc_source_is_browser(source: &str) -> bool {
	let s = source.to_ascii_lowercase();
	s.contains("chrome")
		|| s.contains("msedge")
		|| s.contains("edge")
		|| s.contains("firefox")
		|| s.contains("brave")
		|| s.contains("opera")
		|| s.contains("netflix")
}

fn smtc_compose_title(title: &str, artist: &str, album: &str) -> Option<String> {
	let title = title.trim();
	let artist = artist.trim();
	let album = album.trim();
	let brand = |value: &str| value.eq_ignore_ascii_case("netflix") || value.eq_ignore_ascii_case("youtube");
	if brand(title) && !artist.is_empty() && !brand(artist) {
		return Some(artist.to_string());
	}
	if brand(artist) && !title.is_empty() && !brand(title) {
		return Some(title.to_string());
	}
	if !artist.is_empty() && !title.is_empty() && !artist.eq_ignore_ascii_case(title) {
		return Some(format!("{artist} - {title}"));
	}
	if !title.is_empty() && !brand(title) {
		return Some(title.to_string());
	}
	if !artist.is_empty() && !brand(artist) {
		return Some(artist.to_string());
	}
	if !album.is_empty() && !brand(album) {
		return Some(album.to_string());
	}
	None
}

fn smtc_session_title(session: &GlobalSystemMediaTransportControlsSession) -> Option<(bool, String)> {
	let status = session.GetPlaybackInfo().ok()?.PlaybackStatus().ok()?;
	let playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;
	if !playing && status != GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused {
		return None;
	}
	let source = session.SourceAppUserModelId().ok()?.to_string();
	if !smtc_source_is_browser(&source) {
		return None;
	}
	let props = session.TryGetMediaPropertiesAsync().ok()?.get().ok()?;
	let title = props.Title().ok()?.to_string();
	let artist = props.Artist().ok()?.to_string();
	let album = props.AlbumTitle().ok()?.to_string();
	smtc_compose_title(&title, &artist, &album).map(|text| (playing, text))
}

fn smtc_browser_title_inner() -> Option<String> {
	let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync().ok()?.get().ok()?;
	if let Ok(current) = manager.GetCurrentSession() {
		if let Some((playing, title)) = smtc_session_title(&current) {
			if playing {
				return Some(title);
			}
		}
	}
	let sessions = manager.GetSessions().ok()?;
	let len = sessions.Size().ok()?;
	let mut paused = None;
	for i in 0..len {
		let Ok(session) = sessions.GetAt(i) else {
			continue;
		};
		let Some((playing, title)) = smtc_session_title(&session) else {
			continue;
		};
		if playing {
			return Some(title);
		}
		if paused.is_none() {
			paused = Some(title);
		}
	}
	paused
}

fn smtc_browser_title() -> Option<String> {
	// ponytail: one SMTC session per browser, not per tab. YouTube in another Chrome tab can win.
	// Upgrade: bind session to the window URL / AUMID of the hit.
	static CACHE: Mutex<Option<(Instant, Option<String>)>> = Mutex::new(None);
	let mut cache = CACHE.lock().ok()?;
	if let Some((at, value)) = cache.as_ref() {
		if at.elapsed() < Duration::from_millis(1500) {
			return value.clone();
		}
	}
	let (tx, rx) = std::sync::mpsc::sync_channel(1);
	std::thread::spawn(move || {
		let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
		let _ = tx.send(smtc_browser_title_inner());
	});
	let value = rx.recv_timeout(Duration::from_millis(500)).ok().flatten();
	*cache = Some((Instant::now(), value.clone()));
	value
}

pub fn now_playing(input: NowPlayingInput) -> Option<NowPlaying> {
	let mut ctx = EnumCtx {
		fg: unsafe { GetForegroundWindow() },
		rows: Vec::new(),
	};
	unsafe {
		let _ = EnumWindows(Some(on_window), LPARAM(&mut ctx as *mut EnumCtx as isize));
	}

	let smtc = smtc_browser_title();
	let mut hits: Vec<NowPlaying> = Vec::new();
	for row in ctx.rows {
		let Some(image) = process_image_path(row.pid) else {
			continue;
		};
		let name = exe_key(&image);
		let Some((key, is_browser)) = classify_player(&name, &input) else {
			continue;
		};
		if is_browser && !is_browser_widget_class(&row.class) {
			continue;
		}
		let (url, tabs) = if is_browser {
			uia_collect(row.hwnd)
		} else {
			(None, Vec::new())
		};
		if is_browser && !browser_media_ok(&row.title, url.as_deref(), &tabs, &input) {
			continue;
		}
		let title = if is_browser {
			choose_browser_title(&row.title, &tabs, &input).or_else(|| {
				smtc
					.as_ref()
					.and_then(|title| choose_browser_title(title, &[], &input))
			})
		} else if row.title.trim().is_empty() {
			None
		} else {
			Some(row.title.clone())
		};
		let ipc = if key.contains("mpv") {
			mpv_ipc_path(row.pid)
		} else {
			None
		};
		let file_path = if is_browser {
			None
		} else {
			ipc.or_else(|| title.as_deref().and_then(extract_file_path))
		};
		hits.push(NowPlaying {
			player: key,
			window_id: (row.hwnd.0 as isize).to_string(),
			title,
			file_path,
			url,
			foreground: row.foreground,
			browser: Some(is_browser),
		});
	}
	pick_hit(hits, input.preferred_window_id.as_deref())
}
