mod shared;

#[cfg(windows)]
mod windows;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "linux")]
mod linux;

use crate::types::{NowPlaying, NowPlayingInput};

pub fn now_playing(input: NowPlayingInput) -> Option<NowPlaying> {
	#[cfg(windows)]
	{
		return windows::now_playing(input);
	}
	#[cfg(target_os = "macos")]
	{
		return macos::now_playing(input);
	}
	#[cfg(target_os = "linux")]
	{
		return linux::now_playing(input);
	}
	#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
	{
		let _ = input;
		None
	}
}
