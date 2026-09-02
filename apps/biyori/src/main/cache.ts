import { readdir, stat, unlink } from "node:fs/promises";
import { extname, join } from "node:path";
import { count, eq } from "drizzle-orm";
import type { CacheKind } from "../lib/schemas/cache-kind";
import type { DatabaseClient } from "./db";
import { history, mediaCache, torrentArchive } from "./db/schema";
import { appCacheDir, appFeedDir } from "./lib/app-paths";

export type FileTotals = {
	count: number;
	sizeBytes: number;
};

export type CacheBucket = {
	count: number;
	sizeBytes?: number;
};

export type CacheSummary = {
	history: CacheBucket;
	images: CacheBucket;
	torrents: CacheBucket;
	torrentHistory: CacheBucket;
};

export async function totalNamedFiles(directory: string, fileNames: string[]): Promise<FileTotals> {
	const sizes = await Promise.all(
		fileNames.map(async (fileName) => {
			try {
				const info = await stat(join(directory, fileName));
				return info.isFile() ? info.size : null;
			} catch {
				return null;
			}
		}),
	);
	return sizes.reduce<FileTotals>((total, size) => (size == null ? total : { count: total.count + 1, sizeBytes: total.sizeBytes + size }), { count: 0, sizeBytes: 0 });
}

export async function listTorrentFileNames(directory: string): Promise<string[]> {
	try {
		const entries = await readdir(directory, { withFileTypes: true });
		return entries.filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".torrent").map((entry) => entry.name);
	} catch {
		return [];
	}
}

export async function totalTorrentFiles(directory: string): Promise<FileTotals> {
	return totalNamedFiles(directory, await listTorrentFileNames(directory));
}

export async function loadCacheSummary(database: DatabaseClient): Promise<CacheSummary> {
	const [historyRows, images, archiveRows] = await Promise.all([
		database.select({ value: count() }).from(history).where(eq(history.kind, "history")),
		database.select({ fileName: mediaCache.fileName }).from(mediaCache),
		database.select({ value: count() }).from(torrentArchive),
	]);
	const [imageFiles, torrentFiles] = await Promise.all([
		totalNamedFiles(
			appCacheDir(),
			images.map((row) => row.fileName),
		),
		totalTorrentFiles(appFeedDir()),
	]);
	return {
		history: { count: historyRows[0]?.value ?? 0 },
		images: { count: imageFiles.count, sizeBytes: imageFiles.sizeBytes },
		torrents: { count: torrentFiles.count, sizeBytes: torrentFiles.sizeBytes },
		torrentHistory: { count: archiveRows[0]?.value ?? 0 },
	};
}

async function unlinkNamedFiles(directory: string, fileNames: string[]): Promise<void> {
	await Promise.all(
		fileNames.map(async (fileName) => {
			try {
				await unlink(join(directory, fileName));
			} catch {
				// missing file is already gone
			}
		}),
	);
}

export async function clearCacheKinds(database: DatabaseClient, kinds: CacheKind[]): Promise<CacheSummary> {
	const selected = new Set(kinds);
	if (selected.has("images")) {
		const images = await database.select({ fileName: mediaCache.fileName }).from(mediaCache);
		await unlinkNamedFiles(
			appCacheDir(),
			images.map((row) => row.fileName),
		);
		await database.delete(mediaCache);
	}
	if (selected.has("torrents")) {
		const directory = appFeedDir();
		await unlinkNamedFiles(directory, await listTorrentFileNames(directory));
	}
	if (selected.has("history")) {
		await database.delete(history).where(eq(history.kind, "history"));
	}
	if (selected.has("torrentHistory")) {
		await database.delete(torrentArchive);
	}
	return loadCacheSummary(database);
}
