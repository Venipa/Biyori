import { describe, expect, test } from "bun:test";
import { addDays, startOfDay } from "date-fns";
import { buildAiringSoon, buildContinueWatching, buildUpcoming, SEVEN_DAYS_MS } from "./now-playing-idle";

const now = Date.parse("2026-09-25T12:00:00.000Z");

const listed = {
	id: 1,
	title: "Show",
	status: "Currently watching",
	episodes: 12,
	episodesWatched: 3,
	lastAiredEpisode: 4,
	libraryEpisodes: [1, 2, 3, 4],
	coverUrl: "",
	type: "TV",
};

describe("buildContinueWatching", () => {
	test("keeps the next episode only when the file is on disk", () => {
		expect(buildContinueWatching([{ animeId: 1, episode: 3 }], [listed], now).map((item) => item.nextEpisode)).toEqual([4]);
		expect(buildContinueWatching([{ animeId: 1, episode: 3 }], [{ ...listed, episodesWatched: 4 }], now)).toEqual([]);
	});

	test("includes plan and completed titles, and puts history first", () => {
		const plan = {
			...listed,
			id: 2,
			title: "Planned",
			status: "Plan to watch",
			episodesWatched: 0,
			lastAiredEpisode: 0,
			nextAiringAt: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
			libraryEpisodes: [1],
		};
		const done = { ...listed, id: 3, title: "Finished", status: "Completed" };
		const dropped = { ...listed, id: 4, title: "Dropped", status: "Dropped" };
		const items = buildContinueWatching([{ animeId: 3, episode: 3 }], [plan, listed, done, dropped], now);
		expect(items.map((item) => item.animeId)).toEqual([3, 2, 1]);
	});

	test("skips a file whose episode airs after the 7 day gap", () => {
		const early = {
			...listed,
			status: "Plan to watch",
			episodesWatched: 0,
			lastAiredEpisode: 0,
			nextAiringAt: new Date(now + 8 * 24 * 60 * 60 * 1000).toISOString(),
			libraryEpisodes: [1],
		};
		expect(buildContinueWatching([], [early], now)).toEqual([]);
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
