export type TorrentFact = {
	label: string;
	value: string;
};

export type TorrentParseInput = {
	title: string;
	season: number | null;
	year: number | null;
	episode: number | null;
	episodeLow: number | null;
	episodeHigh: number | null;
	group: string;
	videoFormat: string;
	releaseVersion: number;
	category: string;
	fileExtension: string;
};

function episodeLabel(input: TorrentParseInput): string {
	const { episode, episodeLow, episodeHigh } = input;
	if (episodeLow != null && episodeHigh != null && episodeLow !== episodeHigh) {
		return `${episodeLow}-${episodeHigh}`;
	}
	if (episode != null) {
		return String(episode);
	}
	return "";
}

export function torrentParseFacts(input: TorrentParseInput): TorrentFact[] {
	const rows: Array<[string, string]> = [
		["Title", input.title],
		["Season", input.season == null ? "" : String(input.season)],
		["Year", input.year == null ? "" : String(input.year)],
		["Episode", episodeLabel(input)],
		["Group", input.group],
		["Video", input.videoFormat],
		["Version", input.releaseVersion > 1 ? `v${input.releaseVersion}` : ""],
		["Category", input.category],
		["Extension", input.fileExtension],
	];
	return rows.filter(([, value]) => value).map(([label, value]) => ({ label, value }));
}
