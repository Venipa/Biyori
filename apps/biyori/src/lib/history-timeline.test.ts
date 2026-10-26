import { describe, expect, test } from "bun:test";
import { groupHistory, type HistoryEntry, type HistoryGroupRow, matchesHistoryTypes, parseHistoryTypes } from "./history-timeline";

function entry(id: string, animeId: number, stamp: string, changes: HistoryEntry["changes"], episode = changes.episode ?? 0): HistoryEntry {
	return { id, animeId, title: `A${animeId}`, episode, lastModified: stamp, changes, coverUrl: "" };
}

describe("history timeline", () => {
	test("merges consecutive episodes of one anime per day, keeps other updates separate", () => {
		const days = groupHistory([
			entry("e7", 1, "2026-10-26 12:30", { episode: 7 }),
			entry("e6", 1, "2026-10-26 12:00", { episode: 6, status: "Currently watching" }),
			entry("e5", 1, "2026-10-26 11:30", {}, 5),
			entry("s1", 1, "2026-10-26 11:00", { score: 8 }),
			entry("b1", 2, "2026-10-26 10:00", { episode: 1 }),
			entry("e4", 1, "2026-10-26 09:00", { episode: 4 }),
		]);
		const rows = days.flatMap((day) => day.rows);
		expect(rows.map((row) => row.ids)).toEqual([["e7", "e6", "e5"], ["s1"], ["b1"], ["e4"]]);
		expect(rows[0]?.episodes).toEqual({ from: 5, to: 7, count: 3 });
		expect(rows[0]?.changes).toEqual({ episode: 7, status: "Currently watching" });
		expect(rows[1]?.episodes).toBeUndefined();
	});

	test("splits by local day and skips bad stamps", () => {
		const days = groupHistory([entry("a", 1, "2026-10-26 12:00", { episode: 2 }), entry("x", 1, "garbage", { episode: 1 }), entry("b", 1, "2026-10-20 12:00", { episode: 1 })]);
		expect(days.map((day) => day.rows.map((row) => row.ids[0]))).toEqual([["a"], ["b"]]);
	});
});

describe("history type filter", () => {
	const row = (changes: HistoryGroupRow["changes"], episodes?: HistoryGroupRow["episodes"]): HistoryGroupRow => ({
		ids: ["1"],
		animeId: 1,
		title: "",
		coverUrl: "",
		time: 0,
		changes,
		episodes,
	});

	test("parses and drops unknown types", () => {
		expect(parseHistoryTypes("score,bogus,episode")).toEqual(["episode", "score"]);
		expect(parseHistoryTypes(undefined)).toEqual([]);
	});

	test("matches any active type, all when none", () => {
		expect(matchesHistoryTypes(row({ score: null }), ["score"])).toBe(true);
		expect(matchesHistoryTypes(row({ status: "Completed" }), ["score", "episode"])).toBe(false);
		expect(matchesHistoryTypes(row({}, { from: 1, to: 2, count: 2 }), ["episode"])).toBe(true);
		expect(matchesHistoryTypes(row({ notes: true }), [])).toBe(true);
	});
});
