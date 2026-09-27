import { describe, expect, test } from "bun:test";
import { canApplyProgress, marksEpisodeAdvanced, withAppliedProgress } from "./tracker-progress";

const completedRewatch = {
	episodes: 12,
	episodesWatched: 12,
	status: "Completed",
	rewatching: true,
	timesRewatched: 2,
	dateStarted: "2026-01-01",
	dateCompleted: "2026-01-15",
};

describe("marksEpisodeAdvanced", () => {
	test("counts a higher episode that is not a rewatch", () => {
		expect(marksEpisodeAdvanced({ episodesWatched: 3, rewatching: false }, { progress: 4 })).toBe(true);
	});

	test("ignores a save that keeps the same episode", () => {
		expect(marksEpisodeAdvanced({ episodesWatched: 3, rewatching: false }, { progress: 3 })).toBe(false);
	});

	test("ignores a rewatch", () => {
		expect(marksEpisodeAdvanced({ episodesWatched: 1, rewatching: true }, { progress: 2 })).toBe(false);
		expect(marksEpisodeAdvanced({ episodesWatched: 3, rewatching: false }, { progress: 4, rewatching: true })).toBe(false);
	});
});

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
			canApplyProgress({ ...completedRewatch, episodes: 10, episodesWatched: 5, status: "Currently watching", rewatching: false }, 47, { ignoreOutOfRangeEpisode: false }),
		).toBe(false);
	});

	test("patches list progress onto the now playing match", () => {
		const next = withAppliedProgress(
			{
				episodes: 12,
				episodesWatched: 4,
				status: "Currently watching",
				rewatching: false,
				timesRewatched: 0,
				dateStarted: "2026-01-01",
				dateCompleted: null,
			},
			5,
		);
		expect(next.episodesWatched).toBe(5);
		expect(next.status).toBe("Currently watching");
	});
});
