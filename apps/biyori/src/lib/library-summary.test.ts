import { describe, expect, test } from "bun:test";
import { summarizeLibraryFolders } from "./library-summary";

describe("summarizeLibraryFolders", () => {
	test("assigns nested files to the longest library root", () => {
		const summary = summarizeLibraryFolders(
			[
				{ path: "D:\\Anime", missing: false },
				{ path: "D:\\Anime\\Kids", missing: false },
			],
			[
				{ path: "D:\\Anime\\Show\\01.mkv", animeId: 1, episode: 1, size: 100 },
				{ path: "D:\\Anime\\Kids\\Ponyo\\01.mkv", animeId: 2, episode: 1, size: 50 },
			],
			[{ id: 3, folder: "D:\\Anime\\Kids\\Ponyo" }],
		);

		expect(summary.folders[0]).toMatchObject({ path: "D:\\Anime", series: 1, files: 1, bytes: 100, status: "indexed" });
		expect(summary.folders[1]).toMatchObject({ path: "D:\\Anime\\Kids", series: 2, files: 1, bytes: 50, status: "indexed" });
		expect(summary.outside.files).toBe(0);
		expect(summary.totals.files).toBe(2);
	});

	test("marks missing and empty folders", () => {
		const summary = summarizeLibraryFolders(
			[
				{ path: "D:\\Gone", missing: true },
				{ path: "D:\\Empty", missing: false },
			],
			[{ path: "E:\\Other\\01.mkv", animeId: 9, episode: 1, size: 10 }],
			[],
		);

		expect(summary.folders[0].status).toBe("missing");
		expect(summary.folders[1].status).toBe("empty");
		expect(summary.outside).toEqual({ files: 1, bytes: 10 });
	});
});
