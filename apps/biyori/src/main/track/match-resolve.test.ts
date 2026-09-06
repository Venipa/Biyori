import { describe, expect, test } from "bun:test";
import { type Candidate, namesFrom } from "./match-core";
import { resolveFileMatch } from "./match-resolve";
import { parseRelations, replaceRelationRules } from "./relations";

function candidate(input: { id: number; title: string; episodes: number }): Candidate {
	return {
		id: input.id,
		title: input.title,
		alternativeTitles: "",
		userSynonyms: "",
		type: "TV",
		coverUrl: "",
		bannerUrl: "",
		episodes: input.episodes,
		episodesWatched: 5,
		status: "Currently watching",
		rewatching: false,
		folder: "",
		fansub: "",
		lastAiredEpisode: 7,
		airingStatus: "Currently airing",
		season: "Summer 2026",
		averageScore: 80,
		synopsis: "",
		genres: [],
		producers: [],
		score: null,
		notes: "",
		timesRewatched: 0,
		dateStarted: null,
		dateCompleted: null,
		names: namesFrom(input.title, ""),
	};
}

describe("resolveFileMatch", () => {
	test("hops Bleach S17E47 to Calamity episode 7", () => {
		replaceRelationRules(parseRelations("- 41467|43078|116674:41-50 -> 60636|49444|185874:1-10!\n"));
		const resolved = resolveFileMatch({ title: "Bleach", season: 17, year: 2004 }, 47, [
			candidate({ id: 269, title: "Bleach", episodes: 366 }),
			candidate({ id: 185874, title: "Bleach: Thousand-Year Blood War - The Calamity", episodes: 10 }),
		]);
		expect(resolved.match?.id).toBe(185874);
		expect(resolved.episode).toBe(7);
	});
});
