import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { findEpisodeInFolder, scanLibraryRoots } from "./scan-core";
import type { ScanCandidate } from "./scan-core";

function writeVideo(dir: string, name: string, bytes: number): string {
	mkdirSync(dir, { recursive: true });
	const path = join(dir, name);
	writeFileSync(path, Buffer.alloc(bytes));
	return path;
}

describe("scanLibraryRoots", () => {
	test("matches files in each series folder and does not cross-assign season 4 titles", () => {
		const root = mkdtempSync(join(tmpdir(), "biyori-scan-"));
		const slimeDir = join(root, "Tensei Shitara Slime Datta Ken 4th Season");
		const saoDir = join(root, "Sword Art Online Season 4");
		const slimeFile = writeVideo(slimeDir, "05.mkv", 64);
		const saoFile = writeVideo(saoDir, "05.mkv", 64);

		const slime: ScanCandidate = {
			id: 10,
			names: ["tensei shitara slime datta ken 4th season"],
			episodes: 12,
			folder: slimeDir,
		};
		const sao: ScanCandidate = {
			id: 20,
			names: ["sword art online season 4"],
			episodes: 12,
			folder: saoDir,
		};

		const result = scanLibraryRoots({
			roots: [root],
			threshold: 1,
			candidates: [slime, sao],
		});

		expect(result.files).toBe(2);
		expect(result.scannedRoots).toEqual([root]);
		expect(result.hits).toHaveLength(2);
		expect(result.hits.find((hit) => hit.path === slimeFile)).toEqual({
			path: slimeFile,
			animeId: 10,
			episode: 5,
			size: 64,
		});
		expect(result.hits.find((hit) => hit.path === saoFile)).toEqual({
			path: saoFile,
			animeId: 20,
			episode: 5,
			size: 64,
		});
	});
});

describe("findEpisodeInFolder", () => {
	test("returns the file whose parsed episode matches", () => {
		const folder = mkdtempSync(join(tmpdir(), "biyori-ep-"));
		writeVideo(folder, "04.mkv", 32);
		const wanted = writeVideo(folder, "05.mkv", 32);
		expect(findEpisodeInFolder({ folder, episode: 5, threshold: 1 })).toBe(wanted);
	});
});
