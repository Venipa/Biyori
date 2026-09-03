import { describe, expect, test } from "bun:test";
import { type Candidate, namesFrom, suggestTitles } from "./match-core";

function candidate(input: { id: number; title: string; names?: string[] }): Candidate {
	return {
		id: input.id,
		title: input.title,
		alternativeTitles: "",
		userSynonyms: "",
		type: "TV",
		coverUrl: "",
		bannerUrl: "",
		episodes: 12,
		episodesWatched: 3,
		status: "Currently watching",
		rewatching: false,
		folder: "",
		fansub: "",
		lastAiredEpisode: 8,
		airingStatus: "Currently airing",
		season: "Winter 2026",
		averageScore: 80,
		synopsis: "",
		genres: [],
		producers: [],
		score: null,
		notes: "",
		timesRewatched: 0,
		dateStarted: null,
		dateCompleted: null,
		names: input.names ?? namesFrom(input.title, ""),
	};
}

describe("suggestTitles", () => {
	test("returns nothing for an empty query", () => {
		expect(suggestTitles("   ", [candidate({ id: 1, title: "Jujutsu Kaisen" })])).toEqual([]);
	});

	test("drops candidates below the similar floor", () => {
		expect(suggestTitles("zzzz", [candidate({ id: 1, title: "Jujutsu Kaisen" })])).toEqual([]);
	});

	test("orders closer titles first", () => {
		const hits = suggestTitles("jujutsu", [
			candidate({ id: 2, title: "Chainsaw Man" }),
			candidate({ id: 1, title: "Jujutsu Kaisen" }),
		]);
		expect(hits[0]?.id).toBe(1);
		expect(hits[0]?.score ?? 0).toBeGreaterThan(hits[1]?.score ?? 0);
	});
});
