export type Candidate = {
	id: number;
	names: string[];
	episodes: number;
	folder?: string;
};

export type ParseInput = {
	input: string;
	path?: boolean;
	ignored?: string[];
};

export type ParseTogetherInput = {
	inputs: string[];
	ignored?: string[];
};

export type ParseResult = {
	title: string;
	rawTitle: string;
	season: number | null;
	year: number | null;
	episode: number | null;
	episodeLow: number | null;
	episodeHigh: number | null;
	group: string | null;
	videoResolution: string;
	videoTerm: string;
	releaseVersion: number;
	fileExtension: string;
};

export type ScanHit = {
	path: string;
	animeId: number;
	episode: number;
	size: number;
};

export type ScanInput = {
	roots: string[];
	threshold: number;
	candidates: Candidate[];
	relations?: RelationRule[];
};

export type RelationRule = {
	fromId: number;
	fromStart: number;
	fromEnd?: number;
	toId: number;
	toStart: number;
};

export type ScanResult = {
	files: number;
	scannedRoots: string[];
	hits: ScanHit[];
};

export type ScanProgress = {
	phase: "walk" | "match" | "done" | string;
	/** Walk: files found. Match: files examined so far. */
	files: number;
	hits: number;
	/** Match denominator. `0` during the walk. */
	total: number;
};

export type FindEpisodeInput = {
	folder: string;
	episode: number;
	threshold: number;
	animeId?: number;
	candidates?: Candidate[];
	relations?: RelationRule[];
};

export type NowPlayingInput = {
	processNames: string[];
	browserNames?: string[];
	titleNeedles?: string[];
	urlPatterns?: string[];
	preferredWindowId?: string;
};

export type NowPlaying = {
	player: string;
	windowId: string;
	title: string | null;
	filePath: string | null;
	url: string | null;
	foreground: boolean;
	browser?: boolean;
};

export type MatchInput = {
	title: string;
	season?: number | null;
	year?: number | null;
	episode?: number | null;
	path?: string | null;
	candidates: Candidate[];
	relations?: RelationRule[];
};

export type MatchHit = {
	animeId: number;
	episode: number;
};

export type RecognizeInput = {
	titles: string[];
	ignored?: string[];
	candidates: Candidate[];
	relations?: RelationRule[];
};

export type RecognizeHit = {
	parsed: ParseResult | null;
	animeId: number | null;
	episode: number | null;
};

export declare class Hana {
	parse(input: ParseInput): Promise<ParseResult | null>;
	parseTogether(input: ParseTogetherInput): Promise<(ParseResult | null)[]>;
	scan(input: ScanInput, onProgress?: (progress: ScanProgress) => void): Promise<ScanResult>;
	findEpisode(input: FindEpisodeInput): Promise<string | null>;
	nowPlaying(input: NowPlayingInput): Promise<NowPlaying | null>;
	match(input: MatchInput): Promise<MatchHit | null>;
	recognize(input: RecognizeInput): Promise<RecognizeHit[]>;
	dispose(): Promise<void>;
}

export declare const hana: Hana;
export declare const version: string;
export declare function playerMarkers(): string[];
