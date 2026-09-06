import { describe, expect, test } from "bun:test";
import { buildAiringSoon, buildContinueWatching, buildUpcoming, THREE_DAYS_MS } from "./now-playing-idle";

const listed = {
	id: 1,
	title: "Show",
	episodes: 12,
	episodesWatched: 3,
	lastAiredEpisode: 4,
	libraryEpisodes: [1, 2, 3, 4],
	coverUrl: "",
	type: "TV",
};

describe("buildContinueWatching", () => {
	test("keeps the next episode only when the file is on disk", () => {
		const listedById = new Map([[1, listed]]);
		expect(
			buildContinueWatching([{ animeId: 1, title: "Show", episode: 3 }], listedById, new Set()).map((item) => item.nextEpisode),
		).toEqual([4]);
		expect(buildContinueWatching([{ animeId: 1, title: "Show", episode: 4 }], listedById, new Set())).toEqual([]);
	});

	test("skips completed and dropped ids", () => {
		const listedById = new Map([[1, listed]]);
		expect(buildContinueWatching([{ animeId: 1, title: "Show", episode: 3 }], listedById, new Set([1]))).toEqual([]);
	});
});

describe("buildAiringSoon", () => {
	const now = Date.parse("2026-09-06T12:00:00.000Z");

	function row(id: number, offsetMs: number, extra?: Partial<typeof listed>): typeof listed & { nextAiringAt: string } {
		return {
			...listed,
			id,
			title: `Show ${id}`,
			nextAiringAt: new Date(now + offsetMs).toISOString(),
			...extra,
		};
	}

	test("splits 2d vs 5d vs 8d and drops the past", () => {
		const buckets = buildAiringSoon(
			[row(1, 2 * 24 * 60 * 60 * 1000), row(2, 5 * 24 * 60 * 60 * 1000), row(3, 8 * 24 * 60 * 60 * 1000), row(4, -60_000)],
			new Set(),
			now,
		);
		expect(buckets.soon.map((item) => item.animeId)).toEqual([1]);
		expect(buckets.later.map((item) => item.animeId)).toEqual([2]);
	});

	test("skips already watched next episodes", () => {
		const buckets = buildAiringSoon([row(1, THREE_DAYS_MS, { lastAiredEpisode: 4, episodesWatched: 5 })], new Set(), now);
		expect(buckets.soon).toEqual([]);
		expect(buckets.later).toEqual([]);
	});

	test("omits ids already in continue watching", () => {
		const buckets = buildAiringSoon([row(1, THREE_DAYS_MS)], new Set([1]), now);
		expect(buckets.soon).toEqual([]);
	});
});

describe("buildUpcoming", () => {
	test("omits ids already in the airing columns", () => {
		expect(
			buildUpcoming(
				[
					{ ...listed, id: 1, airingStatus: "Not yet released" },
					{ ...listed, id: 2, title: "Other", airingStatus: "Not yet released" },
				],
				new Set([1]),
			),
		).toEqual([{ id: 2, title: "Other" }]);
	});
});
