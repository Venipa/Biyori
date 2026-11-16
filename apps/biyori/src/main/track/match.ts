import { eq, isNull } from "drizzle-orm";
import { parseStoredTitles, titleStrings, titlesFromFallback } from "../../lib/anime-titles";
import { parseJsonArray } from "../../lib/parse-json-array";
import { parseRelatedMedia } from "../../lib/schemas/related-media";
import type { DatabaseClient } from "../db";
import { anime, listEntry } from "../db/schema";
import { type Candidate, namesFrom } from "./match-core";
import { relationRules } from "./relations";
import { tvPrequelSeasonIndex } from "./series-season";

export type { Candidate } from "./match-core";
export { matchById, namesFrom, similarParsed, suggestTitles } from "./match-core";

export function toHanaCandidates(candidates: Candidate[]) {
	return candidates.map((candidate) => ({
		id: candidate.id,
		names: candidate.names,
		episodes: candidate.episodes,
		folder: candidate.folder ?? "",
		seriesSeason: candidate.seriesSeason ?? undefined,
	}));
}

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
			titles: anime.titles,
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
			related: anime.related,
		})
		.from(listEntry)
		.innerJoin(anime, eq(listEntry.animeId, anime.id));

	const listed = rows.map((row) => ({ id: row.id, type: row.type, related: parseRelatedMedia(row.related) }));
	const mapped = rows.map((row) => ({
		id: row.id,
		title: row.title,
		titles: parseStoredTitles(row.titles) ?? titlesFromFallback(row.title),
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
		names: namesFrom(row.title, titleStrings(parseStoredTitles(row.titles) ?? titlesFromFallback(row.title)), row.userSynonyms),
		seriesSeason: tvPrequelSeasonIndex(row.id, listed),
	}));
	candidateCache = { at: Date.now(), rows: mapped };
	return mapped;
}

/**
 * Library scans also see off-list anime that own a folder or are a relation target of a listed one,
 * so linked NAS folders and split cours index correctly. The tracker uses `loadCandidates` only, so playback never writes these to the list.
 */
export async function loadLibraryHanaCandidates(db: DatabaseClient): Promise<ReturnType<typeof toHanaCandidates>> {
	const listed = await loadCandidates(db);
	const listedIds = new Set(listed.map((candidate) => candidate.id));
	const targets = new Set(
		relationRules()
			.filter((rule) => listedIds.has(rule.fromId))
			.map((rule) => rule.toId),
	);
	const offList = await db
		.select({ id: anime.id, title: anime.title, titles: anime.titles, userSynonyms: anime.userSynonyms, episodes: anime.episodes, folder: anime.folder })
		.from(anime)
		.leftJoin(listEntry, eq(listEntry.animeId, anime.id))
		.where(isNull(listEntry.animeId));
	const extra = offList
		.filter((row) => row.folder !== "" || targets.has(row.id))
		.map((row) => ({
			id: row.id,
			names: namesFrom(row.title, titleStrings(parseStoredTitles(row.titles) ?? titlesFromFallback(row.title)), row.userSynonyms),
			episodes: row.episodes,
			folder: row.folder,
			seriesSeason: undefined,
		}));
	return [...toHanaCandidates(listed), ...extra];
}
