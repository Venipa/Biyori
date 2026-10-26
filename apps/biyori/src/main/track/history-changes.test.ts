import { describe, expect, test } from "bun:test";
import { historyChanges } from "./tracker-progress";

const current = {
	status: "Currently watching",
	episodesWatched: 4,
	score: 7,
	notes: "",
	rewatching: false,
	timesRewatched: 0,
	dateStarted: "2026-10-01",
	dateCompleted: null,
};

describe("history changes", () => {
	test("score-only edit does not count as an episode", () => {
		expect(historyChanges(current, { progress: 4, score: 9, status: "Currently watching" })).toEqual({ score: 9 });
	});

	test("records episode, status, notes, rewatch and dates", () => {
		expect(historyChanges(current, { progress: 5, status: "Completed", notes: "great", timesRewatched: 1, dateCompleted: "2026-10-26" })).toEqual({
			episode: 5,
			status: "Completed",
			notes: true,
			rewatch: true,
			dates: true,
		});
	});

	test("no list entry yet: every provided field is a change", () => {
		expect(historyChanges(undefined, { progress: 1, status: "Currently watching" })).toEqual({ episode: 1, status: "Currently watching" });
	});
});
