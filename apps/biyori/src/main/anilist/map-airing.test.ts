import { describe, expect, test } from "bun:test";
import { toAnimeRow } from "./map";

const title = { romaji: "Test" };

describe("toAnimeRow airing dates", () => {
	test("stores next airing time from AniList unix seconds", () => {
		const row = toAnimeRow({
			id: 1,
			title,
			status: "RELEASING",
			nextAiringEpisode: { episode: 5, airingAt: 1_700_000_000 },
		});
		expect(row.lastAiredEpisode).toBe(4);
		expect(row.nextAiringAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
		expect(row.endDate).toBeNull();
	});

	test("stores last airing date when finished", () => {
		const row = toAnimeRow({
			id: 2,
			title,
			status: "FINISHED",
			episodes: 12,
			endDate: { year: 2024, month: 3, day: 15 },
		});
		expect(row.lastAiredEpisode).toBe(12);
		expect(row.nextAiringAt).toBeNull();
		expect(row.endDate).toBe("2024-03-15");
	});

	test("stores relevant tags and all-time ranks", () => {
		const row = toAnimeRow({
			id: 3,
			title,
			tags: [
				{ name: "Isekai", rank: 80, isMediaSpoiler: false },
				{ name: "Secret", rank: 90, isMediaSpoiler: true },
				{ name: "Weak", rank: 10, isMediaSpoiler: false },
			],
			rankings: [
				{ rank: 12, type: "RATED", allTime: true },
				{ rank: 45, type: "POPULAR", allTime: true },
				{ rank: 2, type: "RATED", allTime: false },
			],
			popularity: 90000,
		});
		expect(row.tags).toBe(JSON.stringify(["Isekai"]));
		expect(row.ratedRank).toBe(12);
		expect(row.popularRank).toBe(45);
		expect(row.popularity).toBe(90000);
	});
});
