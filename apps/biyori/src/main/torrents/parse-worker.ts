import { recognizeFilename, type ParsedFilename } from "@biyori/recognition";
import { createWorkerServe, defineProcedure } from "@biyori/worker";
import type { Candidate } from "../track/match-core";
import { matchById } from "../track/match-core";
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

function episodeRange(
	title: string,
	parsed: ParsedFilename | null,
): { low: number | null; high: number | null } {
	if (parsed?.episodeLow != null && parsed.episodeHigh != null) {
		return { low: parsed.episodeLow, high: parsed.episodeHigh };
	}
	const range = title.match(/\b(\d{1,4})\s*[-~]\s*(\d{1,4})\b/);
	if (range) {
		const low = Number.parseInt(range[1], 10);
		const high = Number.parseInt(range[2], 10);
		if (high >= low) {
			return { low, high };
		}
	}
	return { low: null, high: null };
}

const server = createWorkerServe({
	procedures: {
		parseFeed: defineProcedure((input: ParseFeedInput): ParsedTorrentRow[] => {
			const feed = parseRssItems(input.xml);
			return feed.map((entry) => {
				const recognized = recognizeFilename(entry.title, input.candidates);
				const parsed = recognized?.parsed ?? null;
				const match = recognized?.match
					? (matchById(recognized.match.id, input.candidates) ?? null)
					: null;
				const range = episodeRange(entry.title, parsed);
				const resolution = parsed?.videoResolution ?? "";
				const named = resolution || (resolutionHeight(entry.title) ? `${resolutionHeight(entry.title)}p` : "");
				return {
					entry,
					filename: parsed?.fileName || entry.title,
					episode: range.high,
					episodeLow: range.low,
					episodeHigh: range.high,
					group: parsed?.group ?? "",
					videoFormat: videoFormat(entry.title, parsed?.videoResolution, parsed?.videoTerm),
					videoResolution: named,
					videoTerms: parsed?.videoTerm ?? "",
					releaseVersion: parsed?.releaseVersion || 1,
					category: torrentCategory(entry, range.low, range.high, parsed?.fileExtension ?? ""),
					parsedTitle: recognized?.title || parsed?.title || entry.title,
					match,
				};
			});
		}),
	},
});

export type TorrentParseWorker = typeof server;
