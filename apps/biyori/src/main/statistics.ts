import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { count, eq } from "drizzle-orm";
import type { DatabaseClient } from "./db";
import { anime, listEntry, mediaCache } from "./db/schema";
import { appUptimeSeconds, connectionCounts } from "./http-stats";
import { appCacheDir, appFeedDir } from "./lib/app-paths";
import {
	type StatisticsSummary,
	summarizeList,
} from "./statistics-core";

type FileTotals = {
	count: number;
	sizeBytes: number;
};

async function totalNamedFiles(
	directory: string,
	fileNames: string[],
): Promise<FileTotals> {
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
	return sizes.reduce<FileTotals>(
		(total, size) =>
			size == null
				? total
				: { count: total.count + 1, sizeBytes: total.sizeBytes + size },
		{ count: 0, sizeBytes: 0 },
	);
}

async function totalTorrentFiles(directory: string): Promise<FileTotals> {
	try {
		const entries = await readdir(directory, { withFileTypes: true });
		const fileNames = entries
			.filter(
				(entry) =>
					entry.isFile() && extname(entry.name).toLowerCase() === ".torrent",
			)
			.map((entry) => entry.name);
		return totalNamedFiles(directory, fileNames);
	} catch {
		return { count: 0, sizeBytes: 0 };
	}
}

export type StatisticsResult = StatisticsSummary & {
	localAnimeCount: number;
	imageCount: number;
	imageSizeBytes: number;
	torrentCount: number;
	torrentSizeBytes: number;
	connectionsSucceeded: number;
	connectionsFailed: number;
	connectionCount: number;
	uptimeSeconds: number;
};

export async function loadStatistics(
	database: DatabaseClient,
): Promise<StatisticsResult> {
	const [entries, localRows, images] = await Promise.all([
		database
			.select({
				status: listEntry.status,
				episodes: anime.episodes,
				lastAiredEpisode: anime.lastAiredEpisode,
				episodesWatched: listEntry.episodesWatched,
				timesRewatched: listEntry.timesRewatched,
				durationMinutes: anime.durationMinutes,
				type: anime.type,
				score: listEntry.score,
			})
			.from(listEntry)
			.innerJoin(anime, eq(listEntry.animeId, anime.id)),
		database.select({ value: count() }).from(anime),
		database.select({ fileName: mediaCache.fileName }).from(mediaCache),
	]);
	const [imageFiles, torrentFiles] = await Promise.all([
		totalNamedFiles(
			appCacheDir(),
			images.map((row) => row.fileName),
		),
		totalTorrentFiles(appFeedDir()),
	]);
	const connections = connectionCounts();

	return {
		...summarizeList(entries),
		localAnimeCount: localRows[0]?.value ?? 0,
		imageCount: imageFiles.count,
		imageSizeBytes: imageFiles.sizeBytes,
		torrentCount: torrentFiles.count,
		torrentSizeBytes: torrentFiles.sizeBytes,
		connectionsSucceeded: connections.succeeded,
		connectionsFailed: connections.failed,
		connectionCount: connections.succeeded + connections.failed,
		uptimeSeconds: appUptimeSeconds(),
	};
}
