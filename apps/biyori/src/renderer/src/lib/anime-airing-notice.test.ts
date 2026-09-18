import { describe, expect, test } from "bun:test";
import { animeAiringNotice } from "./anime-airing-notice";

describe("animeAiringNotice", () => {
	test("returns null when empty", () => {
		expect(animeAiringNotice({ airingStatus: "", lastAiredEpisode: 0 })).toBeNull();
	});

	test("hiatus with last episode", () => {
		const notice = animeAiringNotice({ airingStatus: "Hiatus", lastAiredEpisode: 8 });
		expect(notice?.title).toBe("Hiatus");
		expect(notice?.description).toBe("Last aired episode 8");
	});

	test("currently airing with next date", () => {
		const notice = animeAiringNotice({
			airingStatus: "Currently airing",
			lastAiredEpisode: 4,
			nextAiringAt: "2026-11-01T12:00:00.000Z",
		});
		expect(notice?.title).toBe("Episode 5 airs");
		expect(notice?.description).toContain("2026-11-01");
	});

	test("finished uses end date", () => {
		const notice = animeAiringNotice({
			airingStatus: "Finished airing",
			lastAiredEpisode: 12,
			endDate: "2024-03-15",
		});
		expect(notice?.title).toBe("Finished airing");
		expect(notice?.description).toBe("2024-03-15");
	});

	test("attaches all-time ranks", () => {
		const notice = animeAiringNotice({
			airingStatus: "Finished airing",
			lastAiredEpisode: 12,
			ratedRank: 12,
			popularRank: 45,
		});
		expect(notice?.ranks).toEqual([
			{ kind: "rated", rank: 12 },
			{ kind: "popular", rank: 45 },
		]);
	});
});
