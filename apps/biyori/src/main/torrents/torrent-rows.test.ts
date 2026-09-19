import { describe, expect, test } from "bun:test";
import type { ParseResult, RecognizeHit } from "@biyori/hana";
import { emptyStoredTitles } from "../../lib/anime-titles";
import { type Candidate, namesFrom } from "../track/match-core";
import type { RssEntry } from "./rss";
import { torrentRowsFromHits } from "./torrent-rows";

function entry(title: string): RssEntry {
	return {
		guid: title,
		title,
		link: "",
		infoLink: "",
		size: "",
		fileSizeBytes: 0,
		category: "Anime",
		seeders: null,
		leechers: null,
		downloads: null,
		description: "",
		pubDate: "",
	};
}

function candidate(id: number, title: string): Candidate {
	return {
		id,
		title,
		titles: { ...emptyStoredTitles, romaji: title },
		userSynonyms: "",
		type: "TV",
		coverUrl: "",
		bannerUrl: "",
		episodes: 10,
		episodesWatched: 0,
		status: "Currently watching",
		rewatching: false,
		folder: "",
		fansub: "",
		lastAiredEpisode: 0,
		airingStatus: "",
		season: "",
		averageScore: 0,
		synopsis: "",
		genres: [],
		producers: [],
		score: null,
		notes: "",
		timesRewatched: 0,
		dateStarted: null,
		dateCompleted: null,
		names: namesFrom(title),
	};
}

function parsed(episode: number): ParseResult {
	return {
		title: "Bleach Season 17 (2004)",
		rawTitle: "Bleach",
		season: 17,
		year: 2004,
		episode,
		episodeLow: episode,
		episodeHigh: episode,
		group: null,
		videoResolution: "1080p",
		videoTerm: "",
		releaseVersion: 1,
		fileExtension: "mkv",
	};
}

describe("torrentRowsFromHits", () => {
	test("uses hopped episode with hopped anime id", () => {
		const calamity = candidate(185874, "Bleach: Thousand-Year Blood War - The Calamity");
		const hit: RecognizeHit = { parsed: parsed(47), animeId: 185874, episode: 7 };
		const [row] = torrentRowsFromHits([entry("Bleach - S17E47.mkv")], [hit], [calamity]);
		expect(row?.match?.id).toBe(185874);
		expect(row?.episode).toBe(7);
		expect(row?.episodeLow).toBe(7);
		expect(row?.episodeHigh).toBe(7);
		expect(row?.parse).toEqual([
			{ label: "Title", value: "Bleach Season 17 (2004)" },
			{ label: "Season", value: "17" },
			{ label: "Year", value: "2004" },
			{ label: "Episode", value: "7" },
			{ label: "Video", value: "1080p" },
			{ label: "Category", value: "Anime" },
			{ label: "Extension", value: "mkv" },
		]);
	});

	test("keeps filename range when episodeHigh is a batch and drops a hop outside it", () => {
		const calamity = candidate(185874, "Bleach: Thousand-Year Blood War - The Calamity");
		const hit: RecognizeHit = {
			parsed: { ...parsed(1), episodeLow: 1, episodeHigh: 12 },
			animeId: 185874,
			episode: 20,
		};
		const [row] = torrentRowsFromHits([entry("Bleach - 01-12.mkv")], [hit], [calamity]);
		expect(row?.match).toBeNull();
		expect(row?.episode).toBe(12);
		expect(row?.episodeLow).toBe(1);
		expect(row?.episodeHigh).toBe(12);
	});
});
