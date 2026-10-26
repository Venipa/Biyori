import { describe, expect, test } from "bun:test";
import { summarizeActivity, topRatedTitles } from "./statistics-core";

const now = Date.parse("2026-10-26T12:00:00Z");

describe("watch activity", () => {
	test("buckets UTC history stamps into rolling weeks, newest last", () => {
		const activity = summarizeActivity(
			[
				{ lastModified: "2026-10-26 10:00", episode: 3, durationMinutes: 24 },
				{ lastModified: "2026-10-20 13:00", episode: 4, durationMinutes: 24 },
				{ lastModified: "2026-10-18 09:00", episode: 5, durationMinutes: 24 },
				{ lastModified: "2025-01-01 09:00", episode: 1, durationMinutes: 24 },
				{ lastModified: "2026-10-26 11:00", episode: 0, durationMinutes: 24 },
			],
			now,
			4,
		);
		expect(activity.weeks.map((week) => week.count)).toEqual([0, 0, 1, 2]);
		expect(activity.weeks[3]?.ratio).toBe(1);
		expect(activity.lastSevenDays).toEqual({ episodes: 2, minutes: 48 });
	});

	test("empty history gives empty weeks", () => {
		const activity = summarizeActivity([], now, 2);
		expect(activity.weeks.map((week) => week.count)).toEqual([0, 0]);
		expect(activity.lastSevenDays).toEqual({ episodes: 0, minutes: 0 });
	});
});

describe("top rated", () => {
	test("drops unscored, sorts by score then title, limits", () => {
		const rows = [
			{ id: 1, title: "B", score: 9, coverUrl: "" },
			{ id: 2, title: "A", score: 9, coverUrl: "" },
			{ id: 3, title: "C", score: null, coverUrl: "" },
			{ id: 4, title: "D", score: 0, coverUrl: "" },
			{ id: 5, title: "E", score: 7, coverUrl: "" },
		];
		expect(topRatedTitles(rows, 2).map((row) => row.id)).toEqual([2, 1]);
	});
});
