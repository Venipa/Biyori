import { eq } from "drizzle-orm";
import { parseJsonArray } from "../../lib/parse-json-array";
import type { DatabaseClient } from "../db";
import { anime, listEntry } from "../db/schema";
import { type Candidate, namesFrom } from "./match-core";

export type { Candidate } from "./match-core";
export { matchById, matchParsed, matchTitle } from "./match-core";

export async function loadCandidates(db: DatabaseClient): Promise<Candidate[]> {
	const rows = await db
		.select({
			id: anime.id,
			title: anime.title,
			alternativeTitles: anime.alternativeTitles,
			type: anime.type,
			coverUrl: anime.coverUrl,
			bannerUrl: anime.bannerUrl,
			episodes: anime.episodes,
			folder: anime.folder,
			fansub: anime.fansub,
			lastAiredEpisode: anime.lastAiredEpisode,
			airingStatus: anime.airingStatus,
			season: anime.season,
			averageScore: anime.averageScore,
			synopsis: anime.synopsis,
			genres: anime.genres,
			producers: anime.producers,
			episodesWatched: listEntry.episodesWatched,
			status: listEntry.status,
			rewatching: listEntry.rewatching,
			score: listEntry.score,
			notes: listEntry.notes,
			timesRewatched: listEntry.timesRewatched,
			dateStarted: listEntry.dateStarted,
			dateCompleted: listEntry.dateCompleted,
		})
		.from(listEntry)
		.innerJoin(anime, eq(listEntry.animeId, anime.id));

	return rows.map((row) => ({
		id: row.id,
		title: row.title,
		alternativeTitles: row.alternativeTitles,
		type: row.type,
		coverUrl: row.coverUrl,
		bannerUrl: row.bannerUrl,
		episodes: row.episodes,
		episodesWatched: row.episodesWatched,
		status: row.status,
		rewatching: row.rewatching === 1,
		folder: row.folder,
		fansub: row.fansub,
		lastAiredEpisode: row.lastAiredEpisode,
		airingStatus: row.airingStatus,
		season: row.season,
		averageScore: row.averageScore,
		synopsis: row.synopsis,
		genres: parseJsonArray(row.genres),
		producers: parseJsonArray(row.producers),
		score: row.score,
		notes: row.notes,
		timesRewatched: row.timesRewatched,
		dateStarted: row.dateStarted,
		dateCompleted: row.dateCompleted,
		names: namesFrom(row.title, row.alternativeTitles),
	}));
}
