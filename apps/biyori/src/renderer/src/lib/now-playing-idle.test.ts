import { describe, expect, test } from "bun:test";
import { addDays, startOfDay } from "date-fns";
import { buildAiringSoon, buildContinueWatching, buildUpcoming, SEVEN_DAYS_MS } from "./now-playing-idle";

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
		expect(buildContinueWatching([{ animeId: 1, title: "Show", episode: 3 }], listedById, new Set()).map((item) => item.nextEpisode)).toEqual([4]);
		expect(buildContinueWatching([{ animeId: 1, title: "Show", episode: 4 }], listedById, new Set())).toEqual([]);
	});

	test("skips completed and dropped ids", () => {
		const listedById = new Map([[1, listed]]);
		expect(buildContinueWatching([{ animeId: 1, title: "Show", episode: 3 }], listedById, new Set([1]))).toEqual([]);
	});
});

describe("buildAiringSoon", () => {
	const nowDate = new Date(2026, 8, 6, 12);
	const now = nowDate.getTime();

	function row(id: number, when: Date, extra?: Partial<typeof listed>): typeof listed & { nextAiringAt: string } {
		return {
			...listed,
			id,
			title: `Show ${id}`,
			nextAiringAt: when.toISOString(),
			...extra,
		};
	}

	test("groups by local day and drops past and beyond 7 days", () => {
		const groups = buildAiringSoon(
			[
				row(1, new Date(2026, 8, 6, 18)),
				row(2, new Date(2026, 8, 7, 10)),
				row(3, addDays(startOfDay(nowDate), 3)),
				row(4, new Date(now + SEVEN_DAYS_MS + 60_000)),
				row(5, new Date(now - 60_000)),
			],
			new Set(),
			now,
		);
		expect(groups.map((group) => group.label)).toEqual(["Today", "Tomorrow", "Wed 9 Sep"]);
		expect(groups[0]?.items.map((item) => item.animeId)).toEqual([1]);
		expect(groups[1]?.items.map((item) => item.animeId)).toEqual([2]);
		expect(groups[2]?.items.map((item) => item.animeId)).toEqual([3]);
	});

	test("skips already watched next episodes", () => {
		const groups = buildAiringSoon([row(1, new Date(2026, 8, 6, 18), { lastAiredEpisode: 4, episodesWatched: 5 })], new Set(), now);
		expect(groups).toEqual([]);
	});

	test("omits ids already in continue watching", () => {
		const groups = buildAiringSoon([row(1, new Date(2026, 8, 6, 18))], new Set([1]), now);
		expect(groups).toEqual([]);
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
