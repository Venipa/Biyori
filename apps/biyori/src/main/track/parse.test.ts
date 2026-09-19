import { describe, expect, test } from "bun:test";
import { parsePlayback } from "./parse";
import type { NowPlayingMedia } from "./types";

function media(input: { title?: string; filePath?: string }): NowPlayingMedia {
	return {
		player: "mpv",
		windowId: "1",
		title: input.title ?? null,
		filePath: input.filePath ?? null,
		url: null,
		foreground: true,
	};
}

describe("parsePlayback", () => {
	test("exposes an extended season title for matching", async () => {
		const parsed = await parsePlayback(media({ title: "[Sub] Show S4E8.mkv" }));
		expect(parsed).toMatchObject({
			title: "Show Season 4",
			rawTitle: "Show",
			season: 4,
			episode: 8,
		});
	});

	test("reads season from a parent folder", async () => {
		const parsed = await parsePlayback(media({ filePath: "D:/Anime/Show/Season 4/08.mkv" }));
		expect(parsed).toMatchObject({
			title: "Show Season 4",
			episode: 8,
		});
	});

	test("parses a TVDB-style Bleach S17E47 filename as season 17 episode 47", async () => {
		const parsed = await parsePlayback(
			media({
				title: "Bleach (2004) - S17E47 - 413 - THE END 2 [WEBDL-1080p][8bit][h265][AAC 2.0][JA]-ToonsHub.mkv",
			}),
		);
		expect(parsed).toMatchObject({
			title: "Bleach Season 17 (2004)",
			rawTitle: "Bleach",
			season: 17,
			year: 2004,
			episode: 47,
		});
	});
});
