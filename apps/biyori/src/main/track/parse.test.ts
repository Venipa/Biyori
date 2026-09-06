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

	test("parses a TVDB-style Bleach S17E47 filename as season 17 episode 47", () => {
		expect(parseFilename("Bleach (2004) - S17E47 - 413 - THE END 2 [WEBDL-1080p][8bit][h265][AAC 2.0][JA]-ToonsHub.mkv")).toMatchObject({
			title: "Bleach Season 17 (2004)",
			rawTitle: "Bleach",
			season: 17,
			year: 2004,
			episode: 47,
		});
	});
});
