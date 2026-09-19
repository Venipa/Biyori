use napi_derive::napi;

pub const VIDEO_EXT: &[&str] = &[
	"mkv", "mp4", "avi", "webm", "mov", "wmv", "flv", "ts", "m2ts", "mpg", "mpeg",
];

#[napi(object)]
#[derive(Debug, Clone)]
pub struct Candidate {
	pub id: i64,
	pub names: Vec<String>,
	pub episodes: i32,
	pub folder: Option<String>,
}

#[napi(object, js_name = "ParseResult")]
#[derive(Debug, Clone)]
pub struct Parsed {
	pub title: String,
	#[napi(js_name = "rawTitle")]
	pub raw_title: String,
	pub season: Option<i32>,
	pub year: Option<i32>,
	pub episode: Option<i32>,
	#[napi(js_name = "episodeLow")]
	pub episode_low: Option<i32>,
	#[napi(js_name = "episodeHigh")]
	pub episode_high: Option<i32>,
	pub group: Option<String>,
	#[napi(js_name = "videoResolution")]
	pub video_resolution: String,
	#[napi(js_name = "videoTerm")]
	pub video_term: String,
	#[napi(js_name = "releaseVersion")]
	pub release_version: i32,
	#[napi(js_name = "fileExtension")]
	pub file_extension: String,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ScanHit {
	pub path: String,
	#[napi(js_name = "animeId")]
	pub anime_id: i64,
	pub episode: i32,
	pub size: i64,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct RelationRule {
	#[napi(js_name = "fromId")]
	pub from_id: i64,
	#[napi(js_name = "fromStart")]
	pub from_start: i32,
	#[napi(js_name = "fromEnd")]
	pub from_end: Option<i32>,
	#[napi(js_name = "toId")]
	pub to_id: i64,
	#[napi(js_name = "toStart")]
	pub to_start: i32,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ScanInput {
	pub roots: Vec<String>,
	pub threshold: i64,
	pub candidates: Vec<Candidate>,
	pub relations: Option<Vec<RelationRule>>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ScanResult {
	pub files: u32,
	#[napi(js_name = "scannedRoots")]
	pub scanned_roots: Vec<String>,
	pub hits: Vec<ScanHit>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ScanProgress {
	pub phase: String,
	pub files: u32,
	pub hits: u32,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct FindEpisodeInput {
	pub folder: String,
	pub episode: i32,
	pub threshold: i64,
	#[napi(js_name = "animeId")]
	pub anime_id: Option<i64>,
	pub candidates: Option<Vec<Candidate>>,
	pub relations: Option<Vec<RelationRule>>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ParseInput {
	pub input: String,
	pub path: Option<bool>,
	pub ignored: Option<Vec<String>>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ParseTogetherInput {
	pub inputs: Vec<String>,
	pub ignored: Option<Vec<String>>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct NowPlayingInput {
	#[napi(js_name = "processNames")]
	pub process_names: Vec<String>,
	#[napi(js_name = "browserNames")]
	pub browser_names: Option<Vec<String>>,
	#[napi(js_name = "titleNeedles")]
	pub title_needles: Option<Vec<String>>,
	#[napi(js_name = "urlPatterns")]
	pub url_patterns: Option<Vec<String>>,
	#[napi(js_name = "preferredWindowId")]
	pub preferred_window_id: Option<String>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct NowPlaying {
	pub player: String,
	#[napi(js_name = "windowId")]
	pub window_id: String,
	pub title: Option<String>,
	#[napi(js_name = "filePath")]
	pub file_path: Option<String>,
	pub url: Option<String>,
	pub foreground: bool,
	pub browser: Option<bool>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct MatchInput {
	pub title: String,
	pub season: Option<i32>,
	pub year: Option<i32>,
	pub episode: Option<i32>,
	pub path: Option<String>,
	pub candidates: Vec<Candidate>,
	pub relations: Option<Vec<RelationRule>>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct MatchHit {
	#[napi(js_name = "animeId")]
	pub anime_id: i64,
	pub episode: i32,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct RecognizeInput {
	pub titles: Vec<String>,
	pub ignored: Option<Vec<String>>,
	pub candidates: Vec<Candidate>,
	pub relations: Option<Vec<RelationRule>>,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct RecognizeHit {
	pub parsed: Option<Parsed>,
	#[napi(js_name = "animeId")]
	pub anime_id: Option<i64>,
	pub episode: Option<i32>,
}
