use super::shared::{classify_player, file_path_from_cmd, pick_hit, query_unix_mpv};
use crate::types::{NowPlaying, NowPlayingInput};
use sysinfo::{ProcessesToUpdate, System};

pub fn now_playing(input: NowPlayingInput) -> Option<NowPlaying> {
	let mut sys = System::new();
	sys.refresh_processes(ProcessesToUpdate::All, true);
	let mut hits: Vec<NowPlaying> = Vec::new();
	for (pid, proc) in sys.processes() {
		let name = proc.name().to_string_lossy().to_string();
		let Some((key, is_browser)) = classify_player(&name, &input) else {
			continue;
		};
		if is_browser {
			continue;
		}
		let pid_u32 = pid.as_u32();
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
	fn linux_mpv_paths_include_runtime_and_tmp() {
		let paths = unix_mpv_paths(7);
		assert!(paths.iter().any(|path| path.ends_with("mpv-7") || path.ends_with("mpv-socket")));
	}
}
