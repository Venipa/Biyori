import { describe, expect, test } from "bun:test";
import { type Candidate, namesFrom } from "./match-core";
import { resolveFileMatch } from "./match-resolve";
import { parseRelations, replaceRelationRules } from "./relations";

function candidate(input: { id: number; title: string; episodes: number; alternativeTitles?: string }): Candidate {
	return {
		id: input.id,
		title: input.title,
		alternativeTitles: input.alternativeTitles ?? "",
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
		names: namesFrom(input.title, input.alternativeTitles ?? ""),
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

	test("keeps Re:Zero S04E16 on 4th season instead of hopping S2 part 2", () => {
		replaceRelationRules(parseRelations("- 0|0|2:14-25 -> 0|0|3:1-12!\n"));
		const list = [
			candidate({
				id: 2,
				title: "Re:Zero kara Hajimeru Isekai Seikatsu 2nd Season",
				alternativeTitles: "Re - ZERO, Starting Life in Another World 2nd Season",
				episodes: 13,
			}),
			candidate({
				id: 3,
				title: "Re:Zero kara Hajimeru Isekai Seikatsu 2nd Season Part 2",
				alternativeTitles: "Re - ZERO, Starting Life in Another World 2nd Season Part 2",
				episodes: 12,
			}),
			candidate({
				id: 4,
				title: "Re:Zero kara Hajimeru Isekai Seikatsu 4th Season",
				alternativeTitles: "Re - ZERO, Starting Life in Another World 4th Season",
				episodes: 12,
			}),
		];
		const resolved = resolveFileMatch({ title: "Re - ZERO, Starting Life in Another World", season: 4, year: 2016 }, 16, list);
		expect(resolved.match?.id).toBe(4);
		expect(resolved.episode).toBe(16);
	});

	test("picks 4th season from listed season even when English and Japanese titles differ", () => {
		replaceRelationRules(parseRelations("- 0|0|2:14-25 -> 0|0|3:1-12!\n"));
		const resolved = resolveFileMatch({ title: "Re - ZERO, Starting Life in Another World", season: 4, year: 2016 }, 16, [
			candidate({ id: 2, title: "Re:Zero kara Hajimeru Isekai Seikatsu 2nd Season", episodes: 13 }),
			candidate({ id: 3, title: "Re:Zero kara Hajimeru Isekai Seikatsu 2nd Season Part 2", episodes: 12 }),
			candidate({ id: 4, title: "Re:Zero kara Hajimeru Isekai Seikatsu 4th Season", episodes: 25 }),
		]);
		expect(resolved.match?.id).toBe(4);
		expect(resolved.episode).toBe(16);
	});
});
