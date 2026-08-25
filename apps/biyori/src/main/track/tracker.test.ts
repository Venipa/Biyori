import { describe, expect, test } from "bun:test";
import { canApplyProgress, progressPayload } from "./tracker-progress";

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

	test("finishing a rewatch increments repeat and ends rewatching", () => {
		expect(progressPayload(completedRewatch, 12)).toMatchObject({
			progress: 12,
			status: "Completed",
			rewatching: false,
			timesRewatched: 3,
		});
	});
});
