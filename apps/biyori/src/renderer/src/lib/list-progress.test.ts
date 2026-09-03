import { describe, expect, test } from "bun:test";
import {
	collapseEpisodeRanges,
	estimateEpisodeCount,
	libraryEpisodeTooltip,
	listProgressLabel,
	listProgressLayout,
	listProgressRatio,
	nextEpisodeIsAvailable,
} from "./list-progress";

describe("estimateEpisodeCount", () => {
	test("returns the known total", () => {
		expect(estimateEpisodeCount(12, 8)).toBe(12);
	});

	test("normalizes unknown totals", () => {
		expect(estimateEpisodeCount(0, 8)).toBe(12);
		expect(estimateEpisodeCount(0, 20)).toBe(26);
		expect(estimateEpisodeCount(0, 40)).toBe(52);
	});
});

describe("listProgressLayout", () => {
	test("splits watched and aired against the known total", () => {
		expect(
			listProgressLayout({
				watched: 4,
				total: 12,
				available: 6,
				aired: 8,
				finished: false,
			}),
		).toEqual({
			watched: 4 / 12,
			aired: 8 / 12,
			availableStart: 0,
			availableEnd: 6 / 12,
		});
	});

	test("uses 80 percent when the total cannot be estimated", () => {
		expect(listProgressRatio(60, 0)).toBe(0.8);
	});
});

describe("collapseEpisodeRanges", () => {
	test("joins consecutive numbers", () => {
		expect(collapseEpisodeRanges([1, 3, 4, 5, 8])).toEqual([
			[1, 1],
			[3, 5],
			[8, 8],
		]);
	});
});

describe("libraryEpisodeTooltip", () => {
	test("reports when nothing is on disk", () => {
		expect(
			libraryEpisodeTooltip({
				watched: 0,
				total: 12,
				aired: 0,
				finished: false,
				libraryEpisodes: [],
			}),
		).toBe("All episodes are missing");
		expect(
			libraryEpisodeTooltip({
				watched: 0,
				total: 12,
				aired: 0,
				finished: false,
			}),
		).toBe("All episodes are missing");
	});

	test("reports a full library", () => {
		expect(
			libraryEpisodeTooltip({
				watched: 12,
				total: 12,
				aired: 12,
				finished: true,
				libraryEpisodes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
			}),
		).toBe("All episodes are in library folders");
	});

	test("lists missing ranges and the estimated last aired episode", () => {
		expect(
			libraryEpisodeTooltip({
				watched: 2,
				total: 12,
				aired: 8,
				finished: false,
				libraryEpisodes: [1, 2, 4],
			}),
		).toBe("Missing: #3, #5-8\nAired: #8 (estimated)");
	});
});

describe("listProgressLabel", () => {
	test("shows a question mark when total is unknown", () => {
		expect(listProgressLabel(3, 0)).toEqual({ watched: "3", total: "?" });
	});

	test("clamps watched to total", () => {
		expect(listProgressLabel(14, 12)).toEqual({ watched: "12", total: "12" });
	});
});

describe("nextEpisodeIsAvailable", () => {
	test("allows an aired episode", () => {
		expect(nextEpisodeIsAvailable({ nextEpisode: 8, totalEpisodes: 12, lastAiredEpisode: 8 })).toBe(true);
	});

	test("allows a library file that has not been marked aired", () => {
		expect(
			nextEpisodeIsAvailable({
				nextEpisode: 9,
				totalEpisodes: 12,
				lastAiredEpisode: 8,
				libraryEpisodes: [9],
			}),
		).toBe(true);
	});

	test("hides an unaired episode that is not on disk", () => {
		expect(nextEpisodeIsAvailable({ nextEpisode: 9, totalEpisodes: 12, lastAiredEpisode: 8 })).toBe(false);
	});

	test("hides past the known total", () => {
		expect(nextEpisodeIsAvailable({ nextEpisode: 13, totalEpisodes: 12, lastAiredEpisode: 12, libraryEpisodes: [13] })).toBe(false);
	});
});
