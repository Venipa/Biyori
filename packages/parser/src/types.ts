export type ParsedFilename = {
	title: string;
	season: number | null;
	year: number | null;
	episode: number | null;
	episodeLow: number | null;
	episodeHigh: number | null;
	group: string | null;
	videoResolution: string;
	videoTerm: string;
	releaseVersion: number;
	fileName: string;
	fileExtension: string;
};

export type ParseOptions = {
	ignored?: string[];
};
