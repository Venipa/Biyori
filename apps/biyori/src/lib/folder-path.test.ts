import { describe, expect, test } from "bun:test";
import { folderDisplayName, folderPathExists, isPathInsideFolder, normalizeFolderPath, sameFolderPath } from "./folder-path";

describe("folder paths", () => {
	test("strips trailing separators except drive roots", () => {
		expect(normalizeFolderPath("D:\\Anime\\")).toBe("D:\\Anime");
		expect(normalizeFolderPath("C:\\")).toBe("C:\\");
		expect(normalizeFolderPath("/")).toBe("/");
	});

	test("treats trailing-slash and mixed-case paths as the same folder", () => {
		expect(sameFolderPath("D:\\Anime\\", "d:/anime")).toBe(true);
		expect(folderPathExists([{ path: "D:\\Anime" }], "d:\\anime\\")).toBe(true);
	});

	test("uses the last path segment as the folder name", () => {
		expect(folderDisplayName("D:\\Anime\\Show")).toBe("Show");
		expect(folderDisplayName("C:\\")).toBe("C:");
	});

	test("does not treat a prefix sibling as inside the library folder", () => {
		expect(isPathInsideFolder("D:\\AnimeExtra\\ep.mkv", "D:\\Anime")).toBe(false);
		expect(isPathInsideFolder("D:\\Anime\\show\\ep.mkv", "D:\\Anime")).toBe(true);
	});
});
