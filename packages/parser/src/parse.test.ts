import { describe, expect, test } from "bun:test";
import { parseFilename, parsePath } from "./parse";

describe("parseFilename", () => {
	test("keeps season for S04E08", () => {
		expect(parseFilename("[Sub] Show S04E08 [1080p].mkv")).toMatchObject({
			title: "Show",
			season: 4,
			episode: 8,
			episodeLow: 8,
			episodeHigh: 8,
			group: "Sub",
			videoResolution: "1080p",
			fileExtension: "mkv",
		});
	});

	test("keeps season for S4E8", () => {
		expect(parseFilename("[Sub] Show S4E8.mkv")).toMatchObject({
			title: "Show",
			season: 4,
			episode: 8,
			group: "Sub",
		});
	});

	test("keeps season for Season 4 - 08", () => {
		expect(parseFilename("Show Season 4 - 08.mkv")).toMatchObject({
			title: "Show",
			season: 4,
			episode: 8,
		});
	});

	test("reads episode ranges", () => {
		expect(parseFilename("[Sub] Show - 01-12.mkv")).toMatchObject({
			title: "Show",
			episodeLow: 1,
			episodeHigh: 12,
			episode: 12,
		});
	});

	test("reads year, version, and video term", () => {
		expect(parseFilename("[Group] Show (2013) - 08v2 [720p][x264].mkv")).toMatchObject({
			title: "Show",
			year: 2013,
			episode: 8,
			releaseVersion: 2,
			group: "Group",
			videoResolution: "720p",
			videoTerm: "x264",
		});
	});

	test("reads 4th Season", () => {
		expect(parseFilename("Show 4th Season - 03.mkv")).toMatchObject({
			title: "Show",
			season: 4,
			episode: 3,
		});
	});
});

describe("parsePath", () => {
	test("reads season from a parent Season 4 folder", () => {
		expect(parsePath("D:/Anime/Show/Season 4/08.mkv")).toMatchObject({
			title: "Show",
			season: 4,
			episode: 8,
		});
	});
});
