import { describe, expect, test } from "bun:test";
import { type Candidate, namesFrom, relationHopCandidates, suggestTitles } from "./match-core";

function candidate(input: { id: number; title: string; names?: string[]; episodes?: number }): Candidate {
	return {
		id: input.id,
		title: input.title,
		alternativeTitles: "",
		userSynonyms: "",
		type: "TV",
		coverUrl: "",
		bannerUrl: "",
		episodes: input.episodes ?? 12,
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

describe("relationHopCandidates", () => {
	test("includes same-base-title cours that rankParsed might score low", () => {
		const original = candidate({ id: 269, title: "Bleach", episodes: 366 });
		const calamity = candidate({
			id: 185874,
			title: "Bleach: Thousand-Year Blood War - The Calamity",
			episodes: 10,
		});
		const hits = relationHopCandidates({ title: "Bleach", season: 17, year: 2004 }, [original, calamity]);
		expect(hits.map((row) => row.id)).toEqual(expect.arrayContaining([269, 185874]));
		expect(hits).toHaveLength(2);
	});
});
