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

	test("parses mpv.net window titles the same as the filename", () => {
		expect(
			parseFilename(
				"BLACK TORCH (2026) - S01E09 - 009 - ONE [WEBDL-1080p][8bit][x264][AAC 2.0][JA]-Erai-raws - mpv.net",
			),
		).toMatchObject({
			title: "BLACK TORCH (2026)",
			rawTitle: "BLACK TORCH",
			season: 1,
			year: 2026,
			episode: 9,
		});
	});
});
