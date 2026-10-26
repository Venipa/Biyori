import { describe, expect, test } from "bun:test";
import { isSeasonCacheFresh } from "./season-cache-fresh";

const hour = 60 * 60 * 1000;

describe("season cache freshness", () => {
	test("past seasons never expire", () => {
		const now = new Date(2026, 9, 26).getTime();
		expect(isSeasonCacheFresh({ season: "SPRING", seasonYear: 2026, fetchedAt: "2026-04-01T00:00:00Z" }, now)).toBe(true);
	});

	test("current season expires after 12h", () => {
		const now = new Date(2026, 9, 26, 12).getTime();
		const fresh = new Date(now - 2 * hour).toISOString();
		const stale = new Date(now - 13 * hour).toISOString();
		expect(isSeasonCacheFresh({ season: "FALL", seasonYear: 2026, fetchedAt: fresh }, now)).toBe(true);
		expect(isSeasonCacheFresh({ season: "FALL", seasonYear: 2026, fetchedAt: stale }, now)).toBe(false);
	});

	test("recently ended season still refreshes, bad timestamps are stale", () => {
		const now = new Date(2026, 9, 26).getTime();
		expect(isSeasonCacheFresh({ season: "SUMMER", seasonYear: 2026, fetchedAt: new Date(now - 13 * hour).toISOString() }, now)).toBe(false);
		expect(isSeasonCacheFresh({ season: "WINTER", seasonYear: 2027, fetchedAt: "nope" }, now)).toBe(false);
	});
});
