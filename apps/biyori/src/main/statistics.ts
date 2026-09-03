import { count, eq } from "drizzle-orm";
import { parseJsonArray } from "../lib/parse-json-array";
import { totalNamedFiles, totalTorrentFiles } from "./cache";
import type { DatabaseClient } from "./db";
import { anime, episodeFile, listEntry, mediaCache } from "./db/schema";
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
	const [rows, localRows, images, fileRows] = await Promise.all([
		database
			.select({
				title: anime.title,
				status: listEntry.status,
				episodes: anime.episodes,
				lastAiredEpisode: anime.lastAiredEpisode,
				episodesWatched: listEntry.episodesWatched,
				timesRewatched: listEntry.timesRewatched,
				durationMinutes: anime.durationMinutes,
				type: anime.type,
				score: listEntry.score,
				airingStatus: anime.airingStatus,
				genres: anime.genres,
				id: anime.id,
			})
			.from(listEntry)
			.innerJoin(anime, eq(listEntry.animeId, anime.id)),
		database.select({ value: count() }).from(anime),
		database.select({ fileName: mediaCache.fileName }).from(mediaCache),
		database.select({ animeId: episodeFile.animeId }).from(episodeFile),
	]);
	const libraryById = new Map<number, number>();
	for (const file of fileRows) {
		libraryById.set(file.animeId, (libraryById.get(file.animeId) ?? 0) + 1);
	}
	const entries = rows.map((row) => ({
		title: row.title,
		status: row.status,
		episodes: row.episodes,
		lastAiredEpisode: row.lastAiredEpisode,
		episodesWatched: row.episodesWatched,
		timesRewatched: row.timesRewatched,
		durationMinutes: row.durationMinutes,
		type: row.type,
		score: row.score,
		airingStatus: row.airingStatus,
		genres: parseJsonArray(row.genres),
		libraryEpisodeCount: libraryById.get(row.id) ?? 0,
	}));
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
