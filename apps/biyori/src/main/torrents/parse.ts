import { t } from "@biyori/translations/i18n";

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
		[t("main.torrent.fact.title"), input.title],
		[t("main.torrent.fact.season"), input.season == null ? "" : String(input.season)],
		[t("main.torrent.fact.year"), input.year == null ? "" : String(input.year)],
		[t("main.torrent.fact.episode"), episodeLabel(input)],
		[t("main.torrent.fact.group"), input.group],
		[t("main.torrent.fact.video"), input.videoFormat],
		[t("main.torrent.fact.version"), input.releaseVersion > 1 ? `v${input.releaseVersion}` : ""],
		[t("main.torrent.fact.category"), input.category],
		[t("main.torrent.fact.extension"), input.fileExtension],
	];
	return rows.filter(([, value]) => value).map(([label, value]) => ({ label, value }));
}
