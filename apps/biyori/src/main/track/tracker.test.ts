import { describe, expect, test } from "bun:test";
import { canApplyProgress } from "./tracker-progress";

const completedRewatch = {
	episodes: 12,
	episodesWatched: 12,
	status: "Completed",
	rewatching: true,
	timesRewatched: 2,
	dateStarted: "2026-01-01",
};

describe("tracker progress", () => {
	test("uses zero as the baseline when a completed series is rewatched", () => {
		expect(
			canApplyProgress(completedRewatch, 1, {
				ignoreOutOfRangeEpisode: true,
			}),
		).toBe(true);
	});

	test("rejects an episode past the listed count", () => {
		expect(
			canApplyProgress(
				{ ...completedRewatch, episodes: 10, episodesWatched: 5, status: "Currently watching", rewatching: false },
				47,
				{ ignoreOutOfRangeEpisode: false },
			),
		).toBe(false);
	});
});
