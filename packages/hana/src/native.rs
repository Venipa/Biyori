use crate::detect::now_playing;
use crate::parse::parse_query;
use crate::scan::{find_episode, scan_library};
use crate::types::{
	FindEpisodeInput, NowPlaying, NowPlayingInput, ParseInput, ParseResult, ScanInput, ScanProgress, ScanResult,
};
use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use std::panic::{catch_unwind, AssertUnwindSafe};

type ProgressFn = ThreadsafeFunction<ScanProgress, ErrorStrategy::CalleeHandled>;

fn panic_to_err<T: Send>(work: impl FnOnce() -> T + Send) -> Result<T> {
	catch_unwind(AssertUnwindSafe(work)).map_err(|_| Error::from_reason("hana panicked"))
}

pub struct ParseTask {
	input: ParseInput,
}

#[napi]
impl Task for ParseTask {
	type Output = Option<ParseResult>;
	type JsValue = Option<ParseResult>;

	fn compute(&mut self) -> Result<Self::Output> {
		let input = self.input.clone();
		panic_to_err(move || parse_query(&input))
	}

	fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
		Ok(output)
	}
}

#[napi]
pub fn parse(input: ParseInput) -> AsyncTask<ParseTask> {
	AsyncTask::new(ParseTask { input })
}

pub struct ScanTask {
	input: ScanInput,
	progress: Option<ProgressFn>,
}

#[napi]
impl Task for ScanTask {
	type Output = ScanResult;
	type JsValue = ScanResult;

	fn compute(&mut self) -> Result<Self::Output> {
		let input = self.input.clone();
		let progress = self.progress.clone();
		panic_to_err(move || {
			scan_library(input, |update| {
				if let Some(cb) = &progress {
					let _ = cb.call(Ok(update), ThreadsafeFunctionCallMode::NonBlocking);
				}
			})
		})
	}

	fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
		Ok(output)
	}
}

#[napi]
pub fn scan(input: ScanInput, on_progress: Option<ProgressFn>) -> AsyncTask<ScanTask> {
	AsyncTask::new(ScanTask {
		input,
		progress: on_progress,
	})
}

pub struct FindEpisodeTask {
	input: FindEpisodeInput,
}

#[napi]
impl Task for FindEpisodeTask {
	type Output = Option<String>;
	type JsValue = Option<String>;

	fn compute(&mut self) -> Result<Self::Output> {
		let input = self.input.clone();
		panic_to_err(move || find_episode(input))
	}

	fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
		Ok(output)
	}
}

#[napi(js_name = "findEpisode")]
pub fn find_episode_js(input: FindEpisodeInput) -> AsyncTask<FindEpisodeTask> {
	AsyncTask::new(FindEpisodeTask { input })
}

pub struct NowPlayingTask {
	input: NowPlayingInput,
}

#[napi]
impl Task for NowPlayingTask {
	type Output = Option<NowPlaying>;
	type JsValue = Option<NowPlaying>;

	fn compute(&mut self) -> Result<Self::Output> {
		let input = self.input.clone();
		panic_to_err(move || now_playing(input))
	}

	fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
		Ok(output)
	}
}

#[napi(js_name = "nowPlaying")]
pub fn now_playing_js(input: NowPlayingInput) -> AsyncTask<NowPlayingTask> {
	AsyncTask::new(NowPlayingTask { input })
}
