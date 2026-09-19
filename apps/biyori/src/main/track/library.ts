import { randomUUID } from "node:crypto";
import { existsSync, type FSWatcher, statSync, watch } from "node:fs";
import { dirname, join } from "node:path";
import { logger as log } from "@biyori/logger";
import { pathUnderRoot } from "@biyori/recognition";
import { and, eq, sql } from "drizzle-orm";
import { shell } from "electron";
import { type LibrarySummary, summarizeLibraryFolders } from "../../lib/library-summary";
import { completeActivity, pushNotice, upsertActivity } from "../activity";
import type { DatabaseClient } from "../db";
import { anime, episodeFile } from "../db/schema";
import { setAppNotice } from "../notice";
import { loadAppSettings } from "../settings";
import { hana, type ScanHit, type ScanProgress } from "./hana-client";
import { invalidateCandidateCache, loadCandidates } from "./match";
import { refreshRelations, relationRules } from "./relations";

const VIDEO_EXT = /\.(mkv|mp4|avi|webm|mov|wmv|flv|ts|m2ts|mpg|mpeg)$/i;

let db: DatabaseClient | null = null;
const watchers: FSWatcher[] = [];
const dirtyPaths = new Set<string>();
let watchTimer: ReturnType<typeof setTimeout> | null = null;
let scanTail: Promise<unknown> = Promise.resolve();

export function initLibrary(database: DatabaseClient): void {
	db = database;
}

function toScanCandidates(candidates: Awaited<ReturnType<typeof loadCandidates>>): Array<{
	id: number;
	names: string[];
	episodes: number;
	folder: string;
}> {
	return candidates.map((candidate) => ({
		id: candidate.id,
		names: candidate.names,
		episodes: candidate.episodes,
		folder: candidate.folder ?? "",
	}));
}

function toScanRelations() {
	return relationRules().map((rule) => ({
		fromId: rule.fromId,
		fromStart: rule.fromStart,
		toId: rule.toId,
		toStart: rule.toStart,
		...(rule.fromEnd == null ? {} : { fromEnd: rule.fromEnd }),
	}));
}

const INSERT_CHUNK = 80;
const KEEP_CHUNK = 400;

function filesUnderRootSql(root: string) {
	const folder = root.replaceAll("\\", "/").toLowerCase().replace(/\/+$/, "");
	return sql`(lower(replace(${episodeFile.path}, char(92), '/')) = ${folder} or lower(replace(${episodeFile.path}, char(92), '/')) like ${`${folder}/%`})`;
}

function filesUnderAnyRootSql(roots: string[]) {
	return sql.join(
		roots.map((root) => filesUnderRootSql(root)),
		sql` or `,
	);
}

function applyScanHits(database: DatabaseClient, scannedRoots: string[], hits: ScanHit[]): void {
	const matched = hits.filter((hit) => hit.animeId > 0);
	database.transaction((tx) => {
		for (let index = 0; index < matched.length; index += INSERT_CHUNK) {
			const chunk = matched.slice(index, index + INSERT_CHUNK);
			tx.insert(episodeFile)
				.values(
					chunk.map((hit) => ({
						id: randomUUID(),
						animeId: hit.animeId,
						episode: hit.episode,
						path: hit.path,
						size: hit.size,
					})),
				)
				.onConflictDoUpdate({
					target: episodeFile.path,
					set: {
						animeId: sql`excluded.anime_id`,
						episode: sql`excluded.episode`,
						size: sql`excluded.size`,
					},
				})
				.run();
		}
		if (scannedRoots.length > 0) {
			tx.run(sql`create temp table if not exists scan_keep (path text primary key not null)`);
			tx.run(sql`delete from scan_keep`);
			for (let index = 0; index < matched.length; index += KEEP_CHUNK) {
				const chunk = matched.slice(index, index + KEEP_CHUNK);
				tx.run(
					sql`insert or ignore into scan_keep (path) values ${sql.join(
						chunk.map((hit) => sql`(${hit.path})`),
						sql`, `,
					)}`,
				);
			}
			tx.delete(episodeFile)
				.where(sql`(${filesUnderAnyRootSql(scannedRoots)}) and ${episodeFile.path} not in (select path from scan_keep)`)
				.run();
		}
		const assignedFolder = new Set<number>();
		for (const hit of matched) {
			if (assignedFolder.has(hit.animeId)) {
				continue;
			}
			const parent = dirname(hit.path);
			if (isLibraryRoot(parent, scannedRoots) || isLibraryRoot(parent, libraryRoots())) {
				assignedFolder.add(hit.animeId);
				continue;
			}
			tx.update(anime)
				.set({ folder: parent })
				.where(and(eq(anime.id, hit.animeId), eq(anime.folder, "")))
				.run();
			assignedFolder.add(hit.animeId);
		}
	});
	invalidateCandidateCache();
}

function enqueueScan(work: () => Promise<{ files: number; matched: number }>): Promise<{ files: number; matched: number }> {
	const run = scanTail.then(work, work);
	scanTail = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}

function libraryRoots(): string[] {
	return loadAppSettings()
		.libraryFolders.map((folder) => folder.path)
		.filter((path) => path.length > 0);
}

function knownAnimeFolders(database: DatabaseClient): string[] {
	const library = libraryRoots();
	const rows = database.select({ folder: anime.folder }).from(anime).all();
	const folders: string[] = [];
	for (const row of rows) {
		if (!row.folder || !existsSync(row.folder)) {
			continue;
		}
		if (isLibraryRoot(row.folder, library)) {
			continue;
		}
		folders.push(row.folder);
	}
	return collapseRoots(folders);
}

function samePath(left: string, right: string): boolean {
	return pathUnderRoot(left, right) && pathUnderRoot(right, left);
}

function collapseRoots(roots: string[]): string[] {
	const unique = [...new Set(roots)];
	return unique.filter((root) => !unique.some((other) => other !== root && pathUnderRoot(root, other)));
}

function isLibraryRoot(path: string, roots: string[]): boolean {
	return roots.some((root) => samePath(path, root));
}

function pruneGone(database: DatabaseClient, gone: string[]): void {
	if (gone.length === 0) {
		return;
	}
	database.transaction((tx) => {
		for (const root of gone) {
			tx.delete(episodeFile).where(filesUnderRootSql(root)).run();
		}
		const folders = tx.select({ id: anime.id, folder: anime.folder }).from(anime).all();
		for (const row of folders) {
			if (!row.folder || !gone.some((root) => pathUnderRoot(row.folder ?? "", root))) {
				continue;
			}
			tx.update(anime).set({ folder: "" }).where(eq(anime.id, row.id)).run();
		}
	});
}

export async function scanLibrary(database: DatabaseClient = requiredDb()): Promise<{ files: number; matched: number }> {
	return enqueueScan(() => runScan(database, libraryRoots(), "full"));
}

export async function scanLibraryPaths(database: DatabaseClient, roots: string[]): Promise<{ files: number; matched: number }> {
	const existing = collapseRoots(roots.filter((root) => root.length > 0 && existsSync(root)));
	return enqueueScan(() => runScan(database, existing, "full"));
}

export async function loadLibrarySummary(database: DatabaseClient): Promise<LibrarySummary> {
	const folders = loadAppSettings().libraryFolders.map((folder) => ({
		path: folder.path,
		missing: !existsSync(folder.path),
	}));
	const [files, seriesFolders] = await Promise.all([
		database.select({ path: episodeFile.path, animeId: episodeFile.animeId, episode: episodeFile.episode, size: episodeFile.size }).from(episodeFile),
		database.select({ id: anime.id, folder: anime.folder }).from(anime),
	]);
	return summarizeLibraryFolders(folders, files, seriesFolders);
}

export async function scanAvailableEpisodes(database: DatabaseClient = requiredDb()): Promise<{ files: number; matched: number }> {
	const folders = knownAnimeFolders(database);
	if (folders.length > 0) {
		return scanLibraryQuick(database);
	}
	return scanLibrary(database);
}

export function hasIndexedLibrary(database: DatabaseClient = requiredDb()): boolean {
	return knownAnimeFolders(database).length > 0;
}

export async function scanLibraryQuick(database: DatabaseClient = requiredDb()): Promise<{ files: number; matched: number }> {
	return enqueueScan(async () => {
		const folders = knownAnimeFolders(database);
		if (folders.length === 0) {
			return { files: 0, matched: 0 };
		}
		return runScan(database, folders, "quick");
	});
}

export async function runStartupScan(): Promise<void> {
	try {
		if (!hasIndexedLibrary() || !loadAppSettings().onboardingComplete) {
			return;
		}
		await scanLibraryQuick();
	} catch (error) {
		log.error("startup scan failed", error);
	}
}

function onScanProgress(kind: "full" | "quick", progress: ScanProgress): void {
	const prefix = kind === "quick" ? "Checking folders" : "Scanning library";
	if (progress.phase === "walk") {
		const title = `${prefix}... (${progress.files} files)`;
		setAppNotice(title, { toast: false, busy: true });
		upsertActivity({ source: "library-scan", title: prefix, body: `${progress.files} files` });
		return;
	}
	if (progress.phase === "match") {
		const title = `Matching titles... (${progress.hits}/${progress.files})`;
		setAppNotice(title, { toast: false, busy: true });
		upsertActivity({ source: "library-scan", title: "Matching titles", body: `${progress.hits}/${progress.files} matched` });
	}
}

async function runScan(database: DatabaseClient, roots: string[], kind: "full" | "quick" | "watch"): Promise<{ files: number; matched: number }> {
	const existing = roots.filter((root) => existsSync(root));
	if (existing.length === 0) {
		return { files: 0, matched: 0 };
	}
	const settings = loadAppSettings();
	const candidates = await loadCandidates(database);
	await refreshRelations(database);
	if (kind !== "watch") {
		const title = kind === "quick" ? "Checking known folders..." : "Scanning library...";
		setAppNotice(title, { toast: false, busy: true });
		upsertActivity({ source: "library-scan", title: kind === "quick" ? "Checking folders" : "Scanning library", body: "Starting" });
	}
	try {
		const result = await hana.scan(
			{
				roots: existing,
				threshold: settings.fileSizeThreshold,
				candidates: toScanCandidates(candidates),
				relations: toScanRelations(),
			},
			kind === "watch" ? undefined : (progress) => onScanProgress(kind, progress),
		);
		applyScanHits(database, result.scannedRoots, result.hits);
		if (kind !== "watch") {
			const title = `Library scan: ${result.files} files, ${result.hits.length} matched`;
			setAppNotice(title, { toast: false, busy: false });
			completeActivity({
				source: "library-scan",
				title: "Library scan",
				body: `${result.files} files, ${result.hits.length} matched`,
				status: "ok",
			});
		}
		return { files: result.files, matched: result.hits.length };
	} catch (error) {
		if (kind !== "watch") {
			const title = "Library scan failed";
			setAppNotice(title, { toast: false, busy: false });
			completeActivity({ source: "library-scan", title: "Library scan", body: "Failed", status: "error" });
		}
		throw error;
	}
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
	return rows.filter((row) => !folder || pathUnderRoot(row.path, folder)).sort((a, b) => a.episode - b.episode);
}

async function findEpisodePath(database: DatabaseClient, animeId: number, episode: number): Promise<string | null> {
	const indexed = await database
		.select({ path: episodeFile.path })
		.from(episodeFile)
		.where(and(eq(episodeFile.animeId, animeId), eq(episodeFile.episode, episode)))
		.limit(1);
	if (indexed[0]?.path && existsSync(indexed[0].path)) {
		return indexed[0].path;
	}
	const folder = await seriesFolder(database, animeId);
	if (!folder || !existsSync(folder)) {
		return null;
	}
	const candidates = await loadCandidates(database);
	try {
		return await hana.findEpisode({
			folder,
			episode,
			threshold: loadAppSettings().fileSizeThreshold,
			animeId,
			candidates: toScanCandidates(candidates),
			relations: toScanRelations(),
		});
	} catch {
		return null;
	}
}

export async function playEpisode(database: DatabaseClient, animeId: number, episode: number): Promise<{ ok: boolean; path: string | null }> {
	const path = await findEpisodePath(database, animeId, episode);
	if (!path) {
		return { ok: false, path: null };
	}
	void shell.openPath(path);
	return { ok: true, path };
}

export async function playNext(database: DatabaseClient, animeId: number, episodesWatched: number): Promise<{ ok: boolean; path: string | null; episode: number | null }> {
	const rows = await database.select({ episodes: anime.episodes, title: anime.title }).from(anime).where(eq(anime.id, animeId)).limit(1);
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
		const title = `Could not find episode #${episode}`;
		setAppNotice(title);
		pushNotice({
			source: "play-next",
			title: rows[0]?.title ?? "Play next",
			body: `Could not find episode #${episode}`,
		});
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
			const root = folder.path;
			const watcher = watch(root, { recursive: true }, (_event, filename) => {
				if (!filename) {
					return;
				}
				if (/\.(jpe?g|png|webp|nfo|txt|srt|ass|ssa|idx|sub|part|tmp)$/i.test(filename)) {
					return;
				}
				dirtyPaths.add(join(root, filename));
				if (watchTimer) {
					clearTimeout(watchTimer);
				}
				watchTimer = setTimeout(() => {
					watchTimer = null;
					void flushWatch();
				}, 2000);
			});
			watchers.push(watcher);
		} catch {
			/* skip unwatchable roots */
		}
	}
}

function classifyWatchPath(full: string, roots: string[]): { gone?: string; scan?: string } {
	try {
		const info = statSync(full);
		if (info.isDirectory()) {
			return { scan: full };
		}
		if (!VIDEO_EXT.test(full)) {
			return {};
		}
		const parent = dirname(full);
		if (isLibraryRoot(parent, roots)) {
			return { scan: full };
		}
		return { scan: parent };
	} catch {
		return { gone: full };
	}
}

async function flushWatch(): Promise<void> {
	const database = db;
	if (!database) {
		return;
	}
	const pending = [...dirtyPaths];
	dirtyPaths.clear();
	if (pending.length === 0) {
		return;
	}
	const roots = libraryRoots();
	const gone: string[] = [];
	const scan: string[] = [];
	for (const path of pending) {
		const next = classifyWatchPath(path, roots);
		if (next.gone) {
			gone.push(next.gone);
		}
		if (next.scan) {
			scan.push(next.scan);
		}
	}
	pruneGone(database, gone);
	const folders = collapseRoots(scan.filter((path) => existsSync(path)));
	if (folders.length === 0) {
		return;
	}
	await enqueueScan(() => runScan(database, folders, "watch")).catch(() => undefined);
}

export function stopLibraryWatch(): void {
	for (const watcher of watchers) {
		watcher.close();
	}
	watchers.length = 0;
	dirtyPaths.clear();
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
