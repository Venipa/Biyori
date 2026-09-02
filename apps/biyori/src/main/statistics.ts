import { count, eq } from "drizzle-orm";
import { totalNamedFiles, totalTorrentFiles } from "./cache";
import type { DatabaseClient } from "./db";
import { anime, listEntry, mediaCache } from "./db/schema";
import { appUptimeSeconds, connectionCounts } from "./http-stats";
import { appCacheDir, appFeedDir } from "./lib/app-paths";
import { type StatisticsSummary, summarizeList } from "./statistics-core";

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

export async function loadStatistics(database: DatabaseClient): Promise<StatisticsResult> {
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
