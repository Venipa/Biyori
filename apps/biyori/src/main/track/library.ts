import { randomUUID } from "node:crypto";
import { existsSync, type FSWatcher, watch } from "node:fs";
import { dirname } from "node:path";
import { pathUnderRoot } from "@biyori/recognition";
import { eq } from "drizzle-orm";
import { shell } from "electron";
import type { DatabaseClient } from "../db";
import { anime, episodeFile } from "../db/schema";
import { setAppNotice } from "../notice";
import { loadAppSettings } from "../settings";
import { getLibraryScanWorker } from "./scan-client";
import type { ScanCandidate, ScanHit } from "./scan-core";
import { loadCandidates } from "./match";

let db: DatabaseClient | null = null;
const watchers: FSWatcher[] = [];
let watchTimer: ReturnType<typeof setTimeout> | null = null;
let scanInFlight: Promise<{ files: number; matched: number }> | null = null;

export function initLibrary(database: DatabaseClient): void {
	db = database;
}

function toScanCandidates(candidates: Awaited<ReturnType<typeof loadCandidates>>): ScanCandidate[] {
	return candidates.map((candidate) => ({
		id: candidate.id,
		names: candidate.names,
		episodes: candidate.episodes,
		folder: candidate.folder,
		status: candidate.status,
	}));
}

function applyScanHits(database: DatabaseClient, scannedRoots: string[], hits: ScanHit[]): void {
	database.transaction((tx) => {
		const stored = tx.select().from(episodeFile).all();
		const byPath = new Map(stored.map((row) => [row.path, row]));
		const assignedFolder = new Set<number>();
		const hitPaths = new Set<string>();

		for (const hit of hits) {
			hitPaths.add(hit.path);
			const existing = byPath.get(hit.path);
			if (existing) {
				tx.update(episodeFile)
					.set({
						animeId: hit.animeId,
						episode: hit.episode,
						size: hit.size,
					})
					.where(eq(episodeFile.id, existing.id))
					.run();
			} else {
				tx.insert(episodeFile)
					.values({
						id: randomUUID(),
						animeId: hit.animeId,
						episode: hit.episode,
						path: hit.path,
						size: hit.size,
					})
					.run();
			}
			if (assignedFolder.has(hit.animeId)) {
				continue;
			}
			const folderRow = tx.select({ folder: anime.folder }).from(anime).where(eq(anime.id, hit.animeId)).get();
			if (folderRow && !folderRow.folder) {
				tx.update(anime)
					.set({ folder: dirname(hit.path) })
					.where(eq(anime.id, hit.animeId))
					.run();
			}
			assignedFolder.add(hit.animeId);
		}

		if (scannedRoots.length === 0) {
			return;
		}
		for (const row of stored) {
			const underScannedRoot = scannedRoots.some((root) => pathUnderRoot(row.path, root));
			if (!underScannedRoot) {
				continue;
			}
			if (!hitPaths.has(row.path)) {
				tx.delete(episodeFile).where(eq(episodeFile.id, row.id)).run();
			}
		}
	});
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
	const result = await getLibraryScanWorker().invoke.scan({
		roots: settings.libraryFolders.map((folder) => folder.path),
		threshold: settings.fileSizeThreshold,
		candidates: toScanCandidates(candidates),
	});
	applyScanHits(database, result.scannedRoots, result.hits);
	return { files: result.files, matched: result.hits.length };
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
	return getLibraryScanWorker().invoke.findEpisode({
		folder,
		episode,
		threshold: loadAppSettings().fileSizeThreshold,
	});
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
