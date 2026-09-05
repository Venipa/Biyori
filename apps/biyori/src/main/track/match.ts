import { eq } from "drizzle-orm";
import { parseJsonArray } from "../../lib/parse-json-array";
import type { DatabaseClient } from "../db";
import { anime, listEntry } from "../db/schema";
import { type Candidate, namesFrom } from "./match-core";

export type { Candidate } from "./match-core";
export { matchById, matchParsed, matchTitle, namesFrom, similarParsed, suggestTitles } from "./match-core";

const CANDIDATE_TTL_MS = 15_000;
let candidateCache: { at: number; rows: Candidate[] } | null = null;

export function invalidateCandidateCache(): void {
	candidateCache = null;
}

export async function loadCandidates(db: DatabaseClient): Promise<Candidate[]> {
	if (candidateCache && Date.now() - candidateCache.at < CANDIDATE_TTL_MS) {
		return candidateCache.rows;
	}
	const rows = await db
		.select({
			id: anime.id,
			title: anime.title,
			alternativeTitles: anime.alternativeTitles,
			userSynonyms: anime.userSynonyms,
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

	const mapped = rows.map((row) => ({
		id: row.id,
		title: row.title,
		alternativeTitles: row.alternativeTitles,
		userSynonyms: row.userSynonyms,
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
		names: namesFrom(row.title, row.alternativeTitles, row.userSynonyms),
	}));
	candidateCache = { at: Date.now(), rows: mapped };
	return mapped;
}
