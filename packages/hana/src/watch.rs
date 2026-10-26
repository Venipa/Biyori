use notify::{Config, Event, EventKind, PollWatcher, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::{channel, Sender};
use std::thread::JoinHandle;
use std::time::Duration;

/// What the library watcher reports back.
#[derive(Debug, Clone, PartialEq)]
pub enum WatchEvent {
	/// Files or folders under `root` were created, changed, renamed or removed.
	Change { root: String, paths: Vec<String> },
	/// Native watching failed for `root`; it is polled from now on.
	Polling { root: String, reason: String },
}

enum Msg {
	Event(usize, notify::Result<Event>),
	Stop,
}

/// Keeps one watcher per root alive on a worker thread; dropping it stops everything.
pub struct LibraryWatch {
	tx: Sender<Msg>,
	worker: Option<JoinHandle<()>>,
}

impl LibraryWatch {
	pub fn start(roots: Vec<String>, poll_interval: Duration, sink: impl Fn(WatchEvent) + Send + 'static) -> Self {
		let (tx, rx) = channel::<Msg>();
		let worker_tx = tx.clone();
		let worker = std::thread::spawn(move || {
			let mut watchers: Vec<Option<Box<dyn Watcher>>> = Vec::with_capacity(roots.len());
			let mut polled = vec![false; roots.len()];
			for (index, root) in roots.iter().enumerate() {
				match native_watcher(index, root, &worker_tx) {
					Ok(watcher) => watchers.push(Some(watcher)),
					Err(reason) => {
						polled[index] = true;
						watchers.push(poll_watcher(index, root, poll_interval, &worker_tx));
						sink(WatchEvent::Polling { root: root.clone(), reason });
					}
				}
			}
			while let Ok(msg) = rx.recv() {
				let (index, result) = match msg {
					Msg::Stop => break,
					Msg::Event(index, result) => (index, result),
				};
				let root = &roots[index];
				match result {
					Ok(event) => {
						if let Some(paths) = changed_paths(&event) {
							sink(WatchEvent::Change { root: root.clone(), paths });
						}
					}
					// a dead native watcher becomes a poller; poller errors are transient, keep polling
					Err(error) if !polled[index] => {
						polled[index] = true;
						watchers[index] = poll_watcher(index, root, poll_interval, &worker_tx);
						sink(WatchEvent::Polling { root: root.clone(), reason: error.to_string() });
					}
					Err(_) => {}
				}
			}
			drop(watchers);
		});
		Self { tx, worker: Some(worker) }
	}

	pub fn stop(&mut self) {
		let _ = self.tx.send(Msg::Stop);
		if let Some(worker) = self.worker.take() {
			let _ = worker.join();
		}
	}
}

impl Drop for LibraryWatch {
	fn drop(&mut self) {
		self.stop();
	}
}

fn handler(index: usize, tx: &Sender<Msg>) -> impl Fn(notify::Result<Event>) + Send + 'static {
	let tx = tx.clone();
	move |result| {
		let _ = tx.send(Msg::Event(index, result));
	}
}

fn native_watcher(index: usize, root: &str, tx: &Sender<Msg>) -> Result<Box<dyn Watcher>, String> {
	let mut watcher = RecommendedWatcher::new(handler(index, tx), Config::default()).map_err(|error| error.to_string())?;
	watcher.watch(Path::new(root), RecursiveMode::Recursive).map_err(|error| error.to_string())?;
	Ok(Box::new(watcher))
}

fn poll_watcher(index: usize, root: &str, interval: Duration, tx: &Sender<Msg>) -> Option<Box<dyn Watcher>> {
	let mut watcher = PollWatcher::new(handler(index, tx), Config::default().with_poll_interval(interval)).ok()?;
	// top level only: recursive walks over SMB flood the share
	watcher.watch(Path::new(root), RecursiveMode::NonRecursive).ok()?;
	Some(Box::new(watcher))
}

fn changed_paths(event: &Event) -> Option<Vec<String>> {
	if matches!(event.kind, EventKind::Access(_)) || event.paths.is_empty() {
		return None;
	}
	Some(event.paths.iter().map(|path| path.to_string_lossy().into_owned()).collect())
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::fs;
	use std::sync::mpsc::channel;

	#[test]
	fn falls_back_to_polling_and_reports_new_files() {
		let dir = std::env::temp_dir().join(format!("hana-watch-{}", std::process::id()));
		let _ = fs::remove_dir_all(&dir);
		fs::create_dir_all(&dir).unwrap();
		let missing = dir.join("missing").to_string_lossy().into_owned();
		let root = dir.to_string_lossy().into_owned();
		let (tx, rx) = channel();
		let mut watch = LibraryWatch::start(vec![missing.clone(), root.clone()], Duration::from_millis(50), move |event| {
			let _ = tx.send(event);
		});
		let first = rx.recv_timeout(Duration::from_secs(5)).unwrap();
		assert!(matches!(first, WatchEvent::Polling { ref root, .. } if *root == missing));
		std::thread::sleep(Duration::from_millis(200));
		fs::write(dir.join("ep01.mkv"), b"x").unwrap();
		let saw_file = (0..20).any(|_| {
			matches!(rx.recv_timeout(Duration::from_secs(1)), Ok(WatchEvent::Change { ref paths, .. }) if paths.iter().any(|path| path.ends_with("ep01.mkv")))
		});
		watch.stop();
		let _ = fs::remove_dir_all(&dir);
		assert!(saw_file);
	}
}
