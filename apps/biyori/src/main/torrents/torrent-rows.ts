import type { ParseResult, RecognizeHit } from "@biyori/hana";
import type { Candidate } from "../track/match-core";
import { matchById } from "../track/match-core";
import type { MatchedAnime } from "../track/types";
import { type TorrentFact, torrentParseFacts } from "./parse";
import type { RssEntry } from "./rss";
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
	parse: TorrentFact[];
	match: MatchedAnime | null;
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

function episodeRange(title: string, parsed: ParseResult | null): { low: number | null; high: number | null } {
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

export function torrentRowsFromHits(feed: RssEntry[], hits: RecognizeHit[], candidates: Candidate[]): ParsedTorrentRow[] {
	return feed.map((entry, index) => {
		const hit = hits[index];
		const parsed = hit?.parsed ?? null;
		const range = episodeRange(entry.title, parsed);
		const batch = range.low != null && range.high != null && range.high !== range.low;
		const hop = !batch && hit?.episode != null;
		let match = hit?.animeId != null ? (matchById(hit.animeId, candidates) ?? null) : null;
		if (range.low != null && range.high != null && range.high !== range.low && hit?.episode != null && (hit.episode < range.low || hit.episode > range.high)) {
			match = null;
		}
		const episode = hop ? hit.episode : range.high;
		const episodeLow = hop ? hit.episode : range.low;
		const episodeHigh = hop ? hit.episode : range.high;
		const resolution = parsed?.videoResolution ?? "";
		const named = resolution || (resolutionHeight(entry.title) ? `${resolutionHeight(entry.title)}p` : "");
		const group = parsed?.group ?? "";
		const format = videoFormat(entry.title, parsed?.videoResolution, parsed?.videoTerm);
		const category = torrentCategory(entry, episodeLow, episodeHigh, parsed?.fileExtension ?? "");
		const parsedTitle = parsed?.title || entry.title;
		return {
			entry,
			filename: entry.title,
			episode,
			episodeLow,
			episodeHigh,
			group,
			videoFormat: format,
			videoResolution: named,
			videoTerms: parsed?.videoTerm ?? "",
			releaseVersion: parsed?.releaseVersion || 1,
			category,
			parsedTitle,
			parse: torrentParseFacts({
				title: parsedTitle,
				season: parsed?.season ?? null,
				year: parsed?.year ?? null,
				episode,
				episodeLow,
				episodeHigh,
				group,
				videoFormat: format,
				releaseVersion: parsed?.releaseVersion || 1,
				category,
				fileExtension: parsed?.fileExtension ?? "",
			}),
			match,
		};
	});
}
