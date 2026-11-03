import { describe, expect, test } from "bun:test";
import { classifyRootFolders, dropIgnoredHits, type RootFolderAnimeInfo, summarizeLibraryFolders } from "./library-summary";

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

describe("classifyRootFolders", () => {
	const info = new Map<number, RootFolderAnimeInfo>([
		[1, { title: "One", coverUrl: "c1", episodes: 12, onList: true }],
		[2, { title: "Two", coverUrl: "c2", episodes: 12, onList: true }],
	]);
	const dirs = ["D:\\Anime\\Alpha", "D:\\Anime\\Beta", "D:\\Anime\\Gamma", "D:\\Anime\\Delta"];
	const file = (path: string, animeId: number, episode: number) => ({ path, animeId, episode, size: 1 });

	test("matches via episode rows, via anime.folder, multiple, unmatched, ignored, sorted", () => {
		const rows = classifyRootFolders(
			dirs,
			[file("D:\\Anime\\Alpha\\01.mkv", 1, 1), file("D:\\Anime\\Alpha\\02.mkv", 1, 2), file("D:\\Anime\\Gamma\\01.mkv", 1, 1), file("D:\\Anime\\Gamma\\S2\\01.mkv", 2, 1)],
			[{ id: 2, folder: "d:/anime/beta/" }],
			["D:\\Anime\\Delta"],
			info,
		);
		expect(rows.map((row) => [row.name, row.status])).toEqual([
			["Gamma", "multiple"],
			["Alpha", "matched"],
			["Beta", "matched"],
			["Delta", "ignored"],
		]);
		const alpha = rows.find((row) => row.name === "Alpha");
		expect(alpha).toMatchObject({ episodes: 2, files: 2 });
		expect(alpha?.owners[0]).toMatchObject({ animeId: 1, viaFolder: false, title: "One" });
		expect(rows.find((row) => row.name === "Beta")?.owners[0]).toMatchObject({ animeId: 2, viaFolder: true, episodes: 0 });
	});

	test("orders unmatched, multiple, matched, ignored together", () => {
		const root = "D:\\Anime\\";
		const rows = classifyRootFolders(
			[root + "Zed", root + "Ign", root + "Mid", root + "Aaa", root + "Multi"],
			[file(root + "Zed\\01.mkv", 1, 1), file(root + "Multi\\01.mkv", 1, 1), file(root + "Multi\\02.mkv", 2, 1), file(root + "Ign\\01.mkv", 1, 1)],
			[],
			[root + "Ign"],
			info,
		);
		expect(rows.map((row) => [row.name, row.status])).toEqual([
			["Aaa", "unmatched"],
			["Mid", "unmatched"],
			["Multi", "multiple"],
			["Zed", "matched"],
			["Ign", "ignored"],
		]);
	});

	test("folder with nothing is unmatched and loose root files are skipped", () => {
		const rows = classifyRootFolders(["D:\\Anime\\Alpha"], [file("D:\\Anime\\loose.mkv", 1, 1)], [], [], info);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ status: "unmatched", files: 0, owners: [] });
	});
});

describe("dropIgnoredHits", () => {
	test("drops nested paths and keeps siblings", () => {
		const hits = [{ path: "D:\\Anime\\Show\\S1\\01.mkv" }, { path: "D:\\Anime\\Show 2\\01.mkv" }, { path: "D:\\Anime\\Other\\01.mkv" }];
		expect(dropIgnoredHits(hits, ["d:/anime/show"])).toEqual([hits[1], hits[2]]);
	});
});
