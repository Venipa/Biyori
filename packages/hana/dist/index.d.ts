export type Candidate = {
	id: number;
	names: string[];
	episodes: number;
	folder?: string;
	status?: string;
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
};

export type ScanResult = {
	files: number;
	scannedRoots: string[];
	hits: ScanHit[];
};

export type ScanProgress = {
	phase: "walk" | "match" | "done" | string;
	files: number;
	hits: number;
};

export type FindEpisodeInput = {
	folder: string;
	episode: number;
	threshold: number;
};

export type NowPlayingInput = {
	processNames: string[];
	browserNames?: string[];
	titleNeedles?: string[];
	preferredWindowId?: string;
};

export type NowPlaying = {
	player: string;
	windowId: string;
	title: string | null;
	filePath: string | null;
	url: string | null;
	foreground: boolean;
};

export declare class Hana {
	parse(input: ParseInput): Promise<ParseResult | null>;
	parseTogether(input: ParseTogetherInput): Promise<(ParseResult | null)[]>;
	scan(input: ScanInput, onProgress?: (progress: ScanProgress) => void): Promise<ScanResult>;
	findEpisode(input: FindEpisodeInput): Promise<string | null>;
	nowPlaying(input: NowPlayingInput): Promise<NowPlaying | null>;
	dispose(): Promise<void>;
}

export declare const hana: Hana;
export declare const version: string;
