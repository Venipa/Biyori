import { parse } from "anitomy";
import { createWorkerServe, defineProcedure } from "@biyori/worker";
import { matchTitle } from "../track/match-core";
import type { Candidate } from "../track/match-core";
import type { MatchedAnime } from "../track/types";
import { parseRssItems, type RssEntry } from "./rss";
import { videoFormat } from "./video-format";

export type ParsedTorrentRow = {
	entry: RssEntry;
	filename: string;
	episode: number | null;
	group: string;
	videoFormat: string;
	parsedTitle: string;
	match: MatchedAnime | null;
};

export type ParseFeedInput = {
	xml: string;
	candidates: Candidate[];
};

const server = createWorkerServe({
	procedures: {
		parseFeed: defineProcedure((input: ParseFeedInput): ParsedTorrentRow[] => {
			const feed = parseRssItems(input.xml);
			return feed.map((entry) => {
				const parsed = parse(entry.title);
				const match = parsed?.title
					? matchTitle(parsed.title, input.candidates)
					: null;
				const episode =
					parsed?.episode.number && parsed.episode.number > 0
						? parsed.episode.number
						: null;
				return {
					entry,
					filename: parsed?.file.name || entry.title,
					episode,
					group: parsed?.release.group ?? "",
					videoFormat: videoFormat(
						entry.title,
						parsed?.video.resolution,
						parsed?.video.term,
					),
					parsedTitle: parsed?.title || entry.title,
					match,
				};
			});
		}),
	},
});

export type TorrentParseWorker = typeof server;
