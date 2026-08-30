import { randomUUID } from "node:crypto";
import { existsSync, type FSWatcher, watch } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { parseFilename, parsePath, pathUnderRoot, recognizePath } from "@biyori/recognition";
import { eq } from "drizzle-orm";
import { shell } from "electron";
import type { DatabaseClient } from "../db";
import { anime, episodeFile } from "../db/schema";
import { setAppNotice } from "../notice";
import { loadAppSettings } from "../settings";
import { loadCandidates } from "./match";

const VIDEO_EXT = new Set([".mkv", ".mp4", ".avi", ".webm", ".mov", ".wmv", ".flv", ".ts", ".m2ts", ".mpg", ".mpeg"]);

const YIELD_EVERY = 32;

let db: DatabaseClient | null = null;
const watchers: FSWatcher[] = [];
let watchTimer: ReturnType<typeof setTimeout> | null = null;
let scanInFlight: Promise<{ files: number; matched: number }> | null = null;

function yieldToEventLoop(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

async function collectFiles(root: string, threshold: number, out: string[], state: { visited: number }): Promise<boolean> {
	let entries: string[] = [];
	try {
		entries = await readdir(root);
	} catch {
		return false;
	}
	for (const name of entries) {
		const full = join(root, name);
		let fileStat;
		try {
			fileStat = await stat(full);
		} catch {
			continue;
		}
		state.visited += 1;
		if (state.visited % YIELD_EVERY === 0) {
			await yieldToEventLoop();
		}
		if (fileStat.isDirectory()) {
			await collectFiles(full, threshold, out, state);
			continue;
		}
		if (!VIDEO_EXT.has(extname(full).toLowerCase())) {
			continue;
		}
		if (fileStat.size < threshold) {
			continue;
		}
		out.push(full);
	}
	return true;
}

export function initLibrary(database: DatabaseClient): void {
	db = database;
}

export async function scanLibrary(database: DatabaseClient = requiredDb()): Promise<{ files: number; matched: number }> {
	if (scanInFlight) {
		return scanInFlight;
	}
	scanInFlight = runScan(database).finally(() => {
		scanInFlight = null;
	});
	return scanInFlight;
}

async function runScan(database: DatabaseClient): Promise<{ files: number; matched: number }> {
	const settings = loadAppSettings();
	const candidates = await loadCandidates(database);
	const files: string[] = [];
	const scannedRoots: string[] = [];
	const walkState = { visited: 0 };
	for (const folder of settings.libraryFolders) {
		if (!(await existsAsync(folder.path))) {
			continue;
		}
		const ok = await collectFiles(folder.path, settings.fileSizeThreshold, files, walkState);
		if (ok) {
			scannedRoots.push(folder.path);
		}
	}
	const seenPaths = new Set<string>();
	let matched = 0;
	let processed = 0;
	for (const path of files) {
		seenPaths.add(path);
		processed += 1;
		if (processed % YIELD_EVERY === 0) {
			await yieldToEventLoop();
		}
		const recognized = recognizePath(path, candidates);
		if (!recognized?.match) {
			continue;
		}
		const hit = recognized.match;
		matched += 1;
		const episode = recognized.parsed.episode ?? 1;
		let size = 0;
		try {
			size = (await stat(path)).size;
		} catch {
			continue;
		}
		const existing = await database.select({ id: episodeFile.id }).from(episodeFile).where(eq(episodeFile.path, path)).limit(1);
		if (existing[0]) {
			await database
				.update(episodeFile)
				.set({
					animeId: hit.id,
					episode,
					size,
				})
				.where(eq(episodeFile.id, existing[0].id));
		} else {
			await database.insert(episodeFile).values({
				id: randomUUID(),
				animeId: hit.id,
				episode,
				path,
				size,
			});
		}
		if (!hit.folder) {
			await database
				.update(anime)
				.set({ folder: dirname(path) })
				.where(eq(anime.id, hit.id));
			hit.folder = dirname(path);
		}
	}
	if (scannedRoots.length === 0) {
		return { files: files.length, matched };
	}
	const stored = await database.select().from(episodeFile);
	for (const row of stored) {
		const underScannedRoot = scannedRoots.some((root) => row.path.toLowerCase().startsWith(root.toLowerCase()));
		if (!underScannedRoot) {
			continue;
		}
		if (!seenPaths.has(row.path) || !(await existsAsync(row.path))) {
			await database.delete(episodeFile).where(eq(episodeFile.id, row.id));
		}
	}
	return { files: files.length, matched };
}

async function existsAsync(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

function episodeInRange(
	parsed: { episode: number | null; episodeLow: number | null; episodeHigh: number | null },
	episode: number,
): boolean {
	const low = parsed.episodeLow ?? parsed.episode;
	const high = parsed.episodeHigh ?? parsed.episode;
	if (low == null || high == null) {
		return false;
	}
	return episode >= low && episode <= high;
}

async function seriesFolder(database: DatabaseClient, animeId: number): Promise<string> {
	const rows = await database.select({ folder: anime.folder }).from(anime).where(eq(anime.id, animeId)).limit(1);
	return rows[0]?.folder ?? "";
}

export async function listEpisodes(database: DatabaseClient, animeId: number): Promise<Array<{ episode: number; path: string }>> {
	const [folder, rows] = await Promise.all([
		seriesFolder(database, animeId),
		database
			.select({
				episode: episodeFile.episode,
				path: episodeFile.path,
			})
			.from(episodeFile)
			.where(eq(episodeFile.animeId, animeId)),
	]);
	return rows
		.filter((row) => !folder || pathUnderRoot(row.path, folder))
		.sort((a, b) => a.episode - b.episode);
}

async function findEpisodePath(database: DatabaseClient, animeId: number, episode: number): Promise<string | null> {
	const [folder, indexed] = await Promise.all([
		seriesFolder(database, animeId),
		database.select().from(episodeFile).where(eq(episodeFile.animeId, animeId)),
	]);
	for (const row of indexed) {
		if (row.episode !== episode) {
			continue;
		}
		if (folder && !pathUnderRoot(row.path, folder)) {
			continue;
		}
		if (existsSync(row.path)) {
			return row.path;
		}
	}
	if (!folder || !existsSync(folder)) {
		return null;
	}
	const files: string[] = [];
	await collectFiles(folder, loadAppSettings().fileSizeThreshold, files, { visited: 0 });
	for (const path of files) {
		const parsed = parsePath(path) ?? parseFilename(basename(path));
		if (parsed && episodeInRange(parsed, episode)) {
			return path;
		}
	}
	return null;
}

export async function playEpisode(database: DatabaseClient, animeId: number, episode: number): Promise<{ ok: boolean; path: string | null }> {
	const path = await findEpisodePath(database, animeId, episode);
	if (!path) {
		return { ok: false, path: null };
	}
	const error = await shell.openPath(path);
	return { ok: error.length === 0, path };
}

export async function playNext(database: DatabaseClient, animeId: number, episodesWatched: number): Promise<{ ok: boolean; path: string | null; episode: number | null }> {
	const rows = await database.select({ episodes: anime.episodes }).from(anime).where(eq(anime.id, animeId)).limit(1);
	const total = rows[0]?.episodes ?? 0;
	let episode = episodesWatched + 1;
	if (episode < 1) {
		episode = 1;
	}
	if (total > 0 && episode > total) {
		episode = 1;
	}
	const played = await playEpisode(database, animeId, episode);
	if (!played.ok) {
		setAppNotice(`Could not find episode #${episode}`);
	}
	return { ...played, episode };
}

export async function playRandom(database: DatabaseClient, animeId: number): Promise<{ ok: boolean; path: string | null; episode: number | null }> {
	const rows = await listEpisodes(database, animeId);
	if (rows.length === 0) {
		return { ok: false, path: null, episode: null };
	}
	const pick = rows[Math.floor(Math.random() * rows.length)];
	const played = await playEpisode(database, animeId, pick.episode);
	return { ...played, episode: pick.episode };
}

export async function restartLibraryWatch(): Promise<void> {
	stopLibraryWatch();
	if (!db) {
		return;
	}
	const settings = loadAppSettings();
	if (!settings.realtimeMonitor) {
		return;
	}
	for (const folder of settings.libraryFolders) {
		if (!existsSync(folder.path)) {
			continue;
		}
		try {
			const watcher = watch(folder.path, { recursive: true }, () => {
				if (watchTimer) {
					clearTimeout(watchTimer);
				}
				watchTimer = setTimeout(() => {
					if (db) {
						void scanLibrary(db);
					}
				}, 2000);
			});
			watchers.push(watcher);
		} catch {
			/* skip unwatchable roots */
		}
	}
}

export function stopLibraryWatch(): void {
	for (const watcher of watchers) {
		watcher.close();
	}
	watchers.length = 0;
	if (watchTimer) {
		clearTimeout(watchTimer);
		watchTimer = null;
	}
}

function requiredDb(): DatabaseClient {
	if (!db) {
		throw new Error("Library database is not initialized");
	}
	return db;
}
