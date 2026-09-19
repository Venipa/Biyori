import { describe, expect, test } from "bun:test";
import { torrentParseFacts } from "./parse";

describe("torrentParseFacts", () => {
	test("keeps filled filename-style fields and episode ranges", () => {
		expect(
			torrentParseFacts({
				title: "Kimi ga Shinu made Koi wo Shitai",
				season: null,
				year: null,
				episode: 11,
				episodeLow: 11,
				episodeHigh: 11,
				group: "Subs",
				videoFormat: "1080p HEVC",
				releaseVersion: 1,
				category: "Anime",
				fileExtension: "",
			}),
		).toEqual([
			{ label: "Title", value: "Kimi ga Shinu made Koi wo Shitai" },
			{ label: "Episode", value: "11" },
			{ label: "Group", value: "Subs" },
			{ label: "Video", value: "1080p HEVC" },
			{ label: "Category", value: "Anime" },
		]);
		expect(
			torrentParseFacts({
				title: "Bleach Season 17 (2004)",
				season: 17,
				year: 2004,
				episode: 12,
				episodeLow: 1,
				episodeHigh: 12,
				group: "",
				videoFormat: "1080p",
				releaseVersion: 2,
				category: "Batch",
				fileExtension: "mkv",
			}),
		).toEqual([
			{ label: "Title", value: "Bleach Season 17 (2004)" },
			{ label: "Season", value: "17" },
			{ label: "Year", value: "2004" },
			{ label: "Episode", value: "1-12" },
			{ label: "Video", value: "1080p" },
			{ label: "Version", value: "v2" },
			{ label: "Category", value: "Batch" },
			{ label: "Extension", value: "mkv" },
		]);
	});
});
