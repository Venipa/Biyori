import { describe, expect, test } from "bun:test";
import { parseFilename } from "./parse";

describe("parseFilename playback", () => {
	test("exposes an extended season title for matching", () => {
		expect(parseFilename("[Sub] Show S4E8.mkv")).toMatchObject({
			title: "Show Season 4",
			rawTitle: "Show",
			season: 4,
			episode: 8,
		});
	});

	test("reads season from a parent folder", () => {
		expect(parseFilename("D:/Anime/Show/Season 4/08.mkv")).toMatchObject({
			title: "Show Season 4",
			episode: 8,
		});
	});
});
