import { describe, expect, test } from "bun:test";
import type { StatisticsEntry } from "./statistics-core";
import { summarizeList } from "./statistics-core";

function entry(
	overrides: Partial<StatisticsEntry> = {},
): StatisticsEntry {
	return {
		status: "Currently watching",
		episodes: 12,
		lastAiredEpisode: 12,
		episodesWatched: 3,
		timesRewatched: 0,
		durationMinutes: 24,
		type: "TV",
		score: null,
		...overrides,
	};
}

describe("statistics summary", () => {
	test("includes completed rewatches in episode and time totals", () => {
		const summary = summarizeList([
			entry({ episodesWatched: 3, timesRewatched: 2 }),
		]);
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
		const summary = summarizeList([
			entry({ score: 60 }),
			entry({ score: 80 }),
		]);
		expect(summary.meanScore).toBe(7);
		expect(summary.scoreDeviation).toBe(1);
	});
});
