import { describe, expect, test } from "bun:test";
import type { StatisticsEntry } from "./statistics-core";
import { summarizeList } from "./statistics-core";

function entry(overrides: Partial<StatisticsEntry> = {}): StatisticsEntry {
	return {
		title: "Show",
		status: "Currently watching",
		episodes: 12,
		lastAiredEpisode: 12,
		episodesWatched: 3,
		timesRewatched: 0,
		durationMinutes: 24,
		type: "TV",
		score: null,
		airingStatus: "Currently airing",
		genres: [],
		libraryEpisodeCount: 0,
		...overrides,
	};
}

describe("statistics summary", () => {
	test("includes completed rewatches in episode and time totals", () => {
		const summary = summarizeList([entry({ episodesWatched: 3, timesRewatched: 2 })]);
		expect(summary.episodeCount).toBe(27);
		expect(summary.spentMinutes).toBe(648);
	});

	test("uses duration fallbacks and skips completed remaining time", () => {
		const summary = summarizeList([
			entry({
				status: "Completed",
				episodes: 1,
				episodesWatched: 1,
				durationMinutes: 0,
				type: "Movie",
			}),
			entry({ episodes: 12, episodesWatched: 2, durationMinutes: 0 }),
		]);
		expect(summary.spentMinutes).toBe(138);
		expect(summary.remainingMinutes).toBe(240);
	});

	test("calculates population deviation on the ten-point scale", () => {
		const summary = summarizeList([entry({ score: 60 }), entry({ score: 80 })]);
		expect(summary.meanScore).toBe(7);
		expect(summary.scoreDeviation).toBe(1);
	});

	test("counts list status and format", () => {
		const summary = summarizeList([
			entry({ status: "Completed", type: "Movie" }),
			entry({ status: "Currently watching", type: "TV" }),
			entry({ status: "Currently watching", type: "TV" }),
		]);
		expect(summary.statusDistribution.map((item) => [item.label, item.count])).toEqual([
			["Currently watching", 2],
			["Completed", 1],
		]);
		expect(summary.typeDistribution.map((item) => [item.label, item.count])).toEqual([
			["Movie", 1],
			["TV", 2],
		]);
	});

	test("ranks genres and rewatches", () => {
		const summary = summarizeList([
			entry({ title: "A", genres: ["Action", "Fantasy"], timesRewatched: 3 }),
			entry({ title: "B", genres: ["Action"], timesRewatched: 0 }),
			entry({ title: "C", genres: ["Comedy"], timesRewatched: 1 }),
		]);
		expect(summary.genreDistribution[0]).toMatchObject({ label: "Action", count: 2 });
		expect(summary.rewatchDistribution.map((item) => item.label)).toEqual(["A", "C"]);
	});

	test("sums library files against aired episodes", () => {
		const summary = summarizeList([
			entry({
				status: "Currently watching",
				airingStatus: "Currently airing",
				lastAiredEpisode: 8,
				episodesWatched: 3,
				libraryEpisodeCount: 4,
			}),
			entry({
				status: "Completed",
				airingStatus: "Finished airing",
				episodes: 12,
				episodesWatched: 12,
				libraryEpisodeCount: 12,
			}),
		]);
		expect(summary.libraryCoverage.have).toBe(16);
		expect(summary.libraryCoverage.aired).toBe(20);
		expect(summary.libraryCoverage.byStatus[0]?.label).toBe("Currently watching");
		expect(summary.libraryCoverage.byStatus[0]?.count).toBe(4);
		expect(summary.libraryCoverage.byStatus[0]?.total).toBe(8);
	});
});
