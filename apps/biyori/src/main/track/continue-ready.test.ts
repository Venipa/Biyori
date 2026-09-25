import { describe, expect, test } from "bun:test";
import { continueReadyEpisodes } from "./continue-ready";

describe("continueReadyEpisodes", () => {
	const onDisk = new Map<number, ReadonlySet<number>>([[1, new Set([1, 2, 3])]]);
	const nextByAnime = new Map<number, number>([
		[1, 4],
		[2, 1],
	]);

	test("keeps one new file that is the next continue episode", () => {
		expect(
			continueReadyEpisodes(
				[
					{ animeId: 1, episode: 4 },
					{ animeId: 1, episode: 4 },
					{ animeId: 1, episode: 5 },
					{ animeId: 2, episode: 1 },
				],
				onDisk,
				nextByAnime,
			),
		).toEqual([
			{ animeId: 1, episode: 4 },
			{ animeId: 2, episode: 1 },
		]);
	});

	test("skips an episode that is already on disk", () => {
		expect(continueReadyEpisodes([{ animeId: 1, episode: 3 }], onDisk, nextByAnime)).toEqual([]);
	});
});
