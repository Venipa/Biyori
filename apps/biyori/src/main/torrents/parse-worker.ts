import { createWorkerServe, defineProcedure } from "@biyori/worker";
import { parse } from "anitomy";
import type { Candidate } from "../track/match-core";
import { matchTitle } from "../track/match-core";
import type { MatchedAnime } from "../track/types";
import { parseRssItems, type RssEntry } from "./rss";
import { resolutionHeight } from "./size";
import { videoFormat } from "./video-format";

export type ParsedTorrentRow = {
	entry: RssEntry;
	filename: string;
	episode: number | null;
	episodeLow: number | null;
	episodeHigh: number | null;
	group: string;
	videoFormat: string;
	videoResolution: string;
	videoTerms: string;
	releaseVersion: number;
	category: string;
	parsedTitle: string;
	match: MatchedAnime | null;
};

export type ParseFeedInput = {
	xml: string;
	candidates: Candidate[];
};

function torrentCategory(entry: RssEntry, episodeLow: number | null, episodeHigh: number | null, extension: string): string {
	if (/batch/i.test(entry.category) || /batch/i.test(entry.title)) {
		return "Batch";
	}
	if (episodeLow != null && episodeHigh != null && episodeHigh > episodeLow) {
		return "Batch";
	}
	if (extension && !/\b(mkv|mp4|avi|ogm|wmv|flv|ts|m2ts)$/i.test(extension)) {
		return "Other";
	}
	return "Anime";
}

function episodeRange(title: string, parsedNumber: number | undefined): { low: number | null; high: number | null } {
	const range = title.match(/\b(\d{1,4})\s*[-~]\s*(\d{1,4})\b/);
	if (range) {
		const low = Number.parseInt(range[1], 10);
		const high = Number.parseInt(range[2], 10);
		if (high >= low) {
			return { low, high };
		}
	}
	if (parsedNumber && parsedNumber > 0) {
		return { low: parsedNumber, high: parsedNumber };
	}
	return { low: null, high: null };
}

const server = createWorkerServe({
	procedures: {
		parseFeed: defineProcedure((input: ParseFeedInput): ParsedTorrentRow[] => {
			const feed = parseRssItems(input.xml);
			return feed.map((entry) => {
				const parsed = parse(entry.title);
				const match = parsed?.title ? matchTitle(parsed.title, input.candidates) : null;
				const range = episodeRange(entry.title, parsed?.episode.number);
				const resolution = parsed?.video.resolution ?? "";
				const named = resolution || (resolutionHeight(entry.title) ? `${resolutionHeight(entry.title)}p` : "");
				return {
					entry,
					filename: parsed?.file.name || entry.title,
					episode: range.high,
					episodeLow: range.low,
					episodeHigh: range.high,
					group: parsed?.release.group ?? "",
					videoFormat: videoFormat(entry.title, parsed?.video.resolution, parsed?.video.term),
					videoResolution: named,
					videoTerms: parsed?.video.term ?? "",
					releaseVersion: parsed?.release.version || 1,
					category: torrentCategory(entry, range.low, range.high, parsed?.file.extension ?? ""),
					parsedTitle: parsed?.title || entry.title,
					match,
				};
			});
		}),
	},
});

export type TorrentParseWorker = typeof server;
