import { stat } from "node:fs/promises";
import { and, count, eq, exists, gt, gte, ne, or } from "drizzle-orm";
import { parseJsonArray } from "../lib/parse-json-array";
import { displayTitleFromRow } from "./anilist/map";
import { totalNamedFiles, totalTorrentFiles } from "./cache";
import type { DatabaseClient } from "./db";
import { anime, episodeFile, history, listEntry, mediaCache } from "./db/schema";
import { appUptimeSeconds, connectionCounts } from "./http-stats";
import { appCacheDir, appFeedDir } from "./lib/app-paths";
import { loadAppSettings } from "./settings";
import { ACTIVITY_WEEKS, type StatisticsSummary, summarizeActivity, summarizeList, type TopRatedTitle, topRatedTitles, type WatchActivity } from "./statistics-core";

export type StatisticsResult = StatisticsSummary & {
	activity: WatchActivity;
	topRated: TopRatedTitle[];
	localAnimeCount: number;
	imageCount: number;
	imageSizeBytes: number;
	torrentCount: number;
	torrentSizeBytes: number;
	episodeFileCount: number;
	episodeFileSizeBytes: number;
	databaseSizeBytes: number;
	connectionsSucceeded: number;
	connectionsFailed: number;
	connectionCount: number;
	uptimeSeconds: number;
};

async function sqliteFootprintBytes(dbPath: string): Promise<number> {
	let total = 0;
	for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
		try {
			const info = await stat(path);
			if (info.isFile()) {
				total += info.size;
			}
		} catch {}
	}
	return total;
}

export type StatisticsSource = { db: DatabaseClient; path: string };

async function loadSourceRows(database: DatabaseClient, activitySince: string) {
	const [rows, localRows, images, fileRows, historyRows] = await Promise.all([
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
				titles: anime.titles,
				coverUrl: anime.coverUrl,
			})
			.from(listEntry)
			.innerJoin(anime, eq(listEntry.animeId, anime.id)),
		// "local" = has episode files on disk or a linked library folder
		database
			.select({ value: count() })
			.from(anime)
			.where(or(ne(anime.folder, ""), exists(database.select({ id: episodeFile.id }).from(episodeFile).where(eq(episodeFile.animeId, anime.id))))),
		database.select({ fileName: mediaCache.fileName }).from(mediaCache),
		database.select({ animeId: episodeFile.animeId, size: episodeFile.size }).from(episodeFile),
		database
			.select({ lastModified: history.lastModified, episode: history.episode, durationMinutes: anime.durationMinutes })
			.from(history)
			.leftJoin(anime, eq(history.animeId, anime.id))
			.where(and(eq(history.kind, "history"), gt(history.episode, 0), gte(history.lastModified, activitySince))),
	]);
	return { rows, localCount: localRows[0]?.value ?? 0, images, fileRows, historyRows };
}

/** Stats over one or more service DBs ("all accounts" sums them). */
export async function loadStatistics(sources: StatisticsSource[]): Promise<StatisticsResult> {
	// same "YYYY-MM-DD HH:mm" UTC format as history stamps, so the string compare works
	const activitySince = new Date(Date.now() - ACTIVITY_WEEKS * 7 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 16);
	const perSource = await Promise.all(sources.map((source) => loadSourceRows(source.db, activitySince)));
	const rows = perSource.flatMap((source) => source.rows);
	const fileRows = perSource.flatMap((source) => source.fileRows);
	const historyRows = perSource.flatMap((source) => source.historyRows);
	const localAnimeCount = perSource.reduce((sum, source) => sum + source.localCount, 0);
	// cache files are shared between services; count each once
	const imageNames = [...new Set(perSource.flatMap((source) => source.images.map((row) => row.fileName)))];
	let episodeFileSizeBytes = 0;
	for (const file of fileRows) {
		episodeFileSizeBytes += file.size;
	}
	const entries = perSource.flatMap((source) => {
		const libraryById = new Map<number, number>();
		for (const file of source.fileRows) {
			libraryById.set(file.animeId, (libraryById.get(file.animeId) ?? 0) + 1);
		}
		return source.rows.map((row) => ({
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
	});
	const [imageFiles, torrentFiles, databaseSizeBytes] = await Promise.all([
		totalNamedFiles(appCacheDir(), imageNames),
		totalTorrentFiles(appFeedDir()),
		Promise.all(sources.map((source) => sqliteFootprintBytes(source.path))).then((sizes) => sizes.reduce((sum, size) => sum + size, 0)),
	]);
	const connections = connectionCounts();
	const { titleLanguage } = loadAppSettings();

	return {
		...summarizeList(entries),
		activity: summarizeActivity(historyRows.map((row) => ({ ...row, durationMinutes: row.durationMinutes ?? 0 }))),
		topRated: topRatedTitles(rows.map((row) => ({ id: row.id, title: displayTitleFromRow(row.title, row.titles, titleLanguage), score: row.score, coverUrl: row.coverUrl }))),
		localAnimeCount,
		imageCount: imageFiles.count,
		imageSizeBytes: imageFiles.sizeBytes,
		torrentCount: torrentFiles.count,
		torrentSizeBytes: torrentFiles.sizeBytes,
		episodeFileCount: fileRows.length,
		episodeFileSizeBytes,
		databaseSizeBytes,
		connectionsSucceeded: connections.succeeded,
		connectionsFailed: connections.failed,
		connectionCount: connections.succeeded + connections.failed,
		uptimeSeconds: appUptimeSeconds(),
	};
}
