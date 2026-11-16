import { describe, expect, test } from "bun:test";
import { applyFolderRules } from "./folder-rules";

const folder = "D:\\Anime\\Magic Knight Rayearth";
const split = { path: folder, season: null, from: 25, to: null, animeId: 2, offset: -24 };
const specials = { path: folder, season: 0, from: 1, to: null, animeId: 3, offset: 0 };

describe("applyFolderRules", () => {
	test("moves the second cour of a combined release to part 2", () => {
		expect(applyFolderRules([split], { path: `${folder}\\49.mkv`, season: null, episode: 49 })).toEqual({ animeId: 2, episode: 25 });
		expect(applyFolderRules([split], { path: `${folder}\\24.mkv`, season: null, episode: 24 })).toBeNull();
	});

	test("season 0 rule only takes S00 files", () => {
		expect(applyFolderRules([specials], { path: `${folder}\\S00E02.mkv`, season: 0, episode: 2 })).toEqual({ animeId: 3, episode: 2 });
		expect(applyFolderRules([specials], { path: `${folder}\\S01E02.mkv`, season: 1, episode: 2 })).toBeNull();
		expect(applyFolderRules([specials], { path: `${folder}\\02.mkv`, season: null, episode: 2 })).toBeNull();
	});

	test("ignores files outside the rule folder", () => {
		expect(applyFolderRules([split], { path: "D:\\Anime\\Other\\30.mkv", season: null, episode: 30 })).toBeNull();
	});
});
