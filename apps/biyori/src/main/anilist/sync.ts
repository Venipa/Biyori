import { eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { isAnimeStale } from "../../lib/anime-stale";
import { stringifyMediaTitles } from "../../lib/anime-titles";
import type { TitleLanguage } from "../../lib/schemas/app-settings";
import type { RelatedMedia } from "../../lib/schemas/related-media";
import type { AnilistSeasonName, SeasonItem } from "../../lib/schemas/seasons";
import type { DatabaseClient } from "../db";
import { anime, listEntry } from "../db/schema";
import type { Anime, AnimeInsert, ListEntryInsert } from "../db/types";
import { loadAppSettings } from "../settings";
import { anilistGraphql } from "./client";
import {
	type AnilistMedia,
	type AnilistMediaList,
	type AnilistMediaStatus,
	anilistMediaListSchema,
	anilistMediaSchema,
	mediaListCollectionSchema,
	parseStoredTitles,
	searchPageSchema,
	toAnimeRow,
	toListEntryRow,
	toMediaCard,
	toMediaCardCached,
	toRelatedMedia,
	viewerSchema,
	withMediaCardTitle,
} from "./map";
import { GET_ALL_ANIMES_FROM_UID, GET_CURRENT_USER, GET_MEDIA_BY_ID, GET_MEDIA_LIVE, SAVE_MEDIA_LIST_ENTRY, SEARCH_MEDIA, SEASON_MEDIA } from "./queries";
import { readSeasonCache, writeSeasonCache } from "./season-cache";

const INSERT_CHUNK = 40;

function chunkRows<T>(rows: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < rows.length; i += size) {
		out.push(rows.slice(i, i + size));
	}
	return out;
}

export async function fetchViewer(
	token: string,
	signal?: AbortSignal,
): Promise<{
	id: number;
	name: string;
	avatarUrl: string | null;
}> {
	const data = await anilistGraphql<{ Viewer: unknown }>({
		query: GET_CURRENT_USER,
		token,
		signal,
	});
	const viewer = viewerSchema.parse(data.Viewer);
	const avatarUrl = viewer.avatar?.large?.trim() || null;
	return { id: viewer.id, name: viewer.name, avatarUrl };
}

async function forEachMediaListChunk(
	options: { token: string; userId: number; signal?: AbortSignal },
	onChunk: (entries: AnilistMediaList[]) => Promise<void> | void,
): Promise<void> {
	let chunk = 1;
	for (;;) {
		if (options.signal?.aborted) {
			throw new DOMException("Aborted", "AbortError");
		}
		const data = await anilistGraphql<{ MediaListCollection: unknown }>({
			query: GET_ALL_ANIMES_FROM_UID,
			variables: { id: options.userId, chunk },
			token: options.token,
			signal: options.signal,
		});
		const collection = mediaListCollectionSchema.parse(data.MediaListCollection);
		const entries: AnilistMediaList[] = [];
		for (const list of collection.lists ?? []) {
			for (const entry of list?.entries ?? []) {
				if (!entry) {
					continue;
				}
				entries.push(entry);
			}
		}
		await onChunk(entries);
		if (!collection.hasNextChunk) {
			break;
		}
		chunk += 1;
	}
}

export async function searchAniListMedia(options: {
	token?: string;
	query: string;
	page: number;
	titleLanguage?: "Romaji" | "English" | "Native";
}): Promise<{ items: SeasonItem[]; hasNextPage: boolean }> {
	const data = await anilistGraphql<{ Page: unknown }>({
		query: SEARCH_MEDIA,
		variables: {
			query: options.query,
		},
		token: options.token,
	});
	const page = searchPageSchema.parse(data.Page);
	const items = (page.media ?? []).filter((item): item is AnilistMedia => Boolean(item)).map((item) => toMediaCard(item, options.titleLanguage));
	return {
		items,
		hasNextPage: Boolean(page.pageInfo?.hasNextPage),
	};
}

export async function fetchSeasonMedia(options: {
	token?: string;
	season: AnilistSeasonName;
	seasonYear: number;
	titleLanguage: "Romaji" | "English" | "Native";
	forceRefresh?: boolean;
	signal?: AbortSignal;
}): Promise<{
	items: SeasonItem[];
	fromCache: boolean;
	fetchedAt: string | null;
}> {
	const resolve = (items: Parameters<typeof withMediaCardTitle>[0][]) => items.map((item) => withMediaCardTitle(item, options.titleLanguage));

	if (!options.forceRefresh) {
		const cached = readSeasonCache(options.season, options.seasonYear);
		if (cached) {
			return {
				items: resolve(cached.items),
				fromCache: true,
				fetchedAt: cached.fetchedAt,
			};
		}
	}

	const items: ReturnType<typeof toMediaCardCached>[] = [];
	let page = 1;
	for (;;) {
		if (options.signal?.aborted) {
			throw new DOMException("Aborted", "AbortError");
		}
		const data = await anilistGraphql<{ Page: unknown }>({
			query: SEASON_MEDIA,
			variables: {
				season: options.season,
				seasonYear: options.seasonYear,
				page,
			},
			token: options.token,
			signal: options.signal,
		});
		const parsed = searchPageSchema.parse(data.Page);
		for (const media of parsed.media ?? []) {
			if (!media) {
				continue;
			}
			items.push(toMediaCardCached(media));
		}
		if (!parsed.pageInfo?.hasNextPage) {
			break;
		}
		page += 1;
	}

	const written = writeSeasonCache({
		season: options.season,
		seasonYear: options.seasonYear,
		items,
	});
	return {
		items: resolve(written.items),
		fromCache: false,
		fetchedAt: written.fetchedAt,
	};
}

export async function saveMediaListEntry(options: {
	token: string;
	mediaId: number;
	status: AnilistMediaStatus;
	progress?: number;
	score?: number | null;
	repeat?: number;
	notes?: string;
	startedAt?: { year: number; month: number; day: number };
	completedAt?: { year: number; month: number; day: number };
}): Promise<AnilistMediaList> {
	const data = await anilistGraphql<{ SaveMediaListEntry: unknown }>({
		query: SAVE_MEDIA_LIST_ENTRY,
		variables: {
			mediaId: options.mediaId,
			status: options.status,
			progress: options.progress,
			score: options.score ?? undefined,
			repeat: options.repeat,
			notes: options.notes,
			startedAt: options.startedAt,
			completedAt: options.completedAt,
		},
		token: options.token,
	});
	return anilistMediaListSchema.parse(data.SaveMediaListEntry);
}

export async function upsertAnimeFromMedia(
	db: Pick<DatabaseClient, "select" | "insert" | "update">,
	media: AnilistMedia,
	titleLanguage: "Romaji" | "English" | "Native" = "Romaji",
	fresh?: { related: RelatedMedia[]; staleAt: string },
): Promise<Pick<Anime, "id" | "coverUrl" | "bannerUrl">> {
	const animeRow = toAnimeRow(media, titleLanguage);
	const existing = await db.select({ id: anime.id }).from(anime).where(eq(anime.id, media.id)).limit(1);
	const freshPatch = fresh
		? {
				related: JSON.stringify(fresh.related),
				staleAt: fresh.staleAt,
			}
		: {};

	if (existing[0]) {
		await db
			.update(anime)
			.set({
				title: animeRow.title,
				titles: animeRow.titles,
				type: animeRow.type,
				episodes: animeRow.episodes,
				durationMinutes: animeRow.durationMinutes,
				averageScore: animeRow.averageScore,
				popularity: animeRow.popularity,
				ratedRank: animeRow.ratedRank,
				popularRank: animeRow.popularRank,
				season: animeRow.season,
				airingStatus: animeRow.airingStatus,
				genres: animeRow.genres,
				tags: animeRow.tags,
				producers: animeRow.producers,
				synopsis: animeRow.synopsis,
				lastAiredEpisode: animeRow.lastAiredEpisode,
				nextAiringAt: animeRow.nextAiringAt,
				endDate: animeRow.endDate,
				coverUrl: animeRow.coverUrl,
				bannerUrl: animeRow.bannerUrl,
				...freshPatch,
			})
			.where(eq(anime.id, media.id));
	} else {
		await db.insert(anime).values({ ...animeRow, ...freshPatch });
	}

	return {
		id: media.id,
		coverUrl: animeRow.coverUrl || "",
		bannerUrl: animeRow.bannerUrl || "",
	} satisfies Pick<Anime, "id" | "coverUrl" | "bannerUrl">;
}

/** Fetch AniList when missing or stale. Writes related media. */
export async function ensureAnimeCached(options: {
	db: Pick<DatabaseClient, "select" | "insert" | "update">;
	id: number;
	token?: string;
	titleLanguage: "Romaji" | "English" | "Native";
	signal?: AbortSignal;
}): Promise<{ id: number }> {
	const existing = await options.db.select({ id: anime.id, titles: anime.titles, staleAt: anime.staleAt }).from(anime).where(eq(anime.id, options.id)).limit(1);
	if (existing[0] && parseStoredTitles(existing[0].titles) && !isAnimeStale(existing[0].staleAt)) {
		return { id: existing[0].id };
	}

	const data = await anilistGraphql<{ Media: unknown }>({
		query: GET_MEDIA_BY_ID,
		variables: { id: options.id },
		token: options.token,
		signal: options.signal,
	});
	if (data.Media == null) {
		throw new Error(`AniList media ${options.id} not found`);
	}
	const media = anilistMediaSchema.parse(data.Media);
	const related = toRelatedMedia(media, options.titleLanguage);
	const upserted = await upsertAnimeFromMedia(options.db, media, options.titleLanguage, {
		related,
		staleAt: new Date().toISOString(),
	});
	await upsertRelatedCatalog(options.db, related);
	return { id: upserted.id };
}

async function upsertRelatedCatalog(db: Pick<DatabaseClient, "insert">, items: RelatedMedia[]): Promise<void> {
	for (const item of items) {
		if (item.mediaType !== "ANIME") {
			continue;
		}
		await db
			.insert(anime)
			.values({
				id: item.id,
				title: item.title,
				titles: stringifyMediaTitles({ romaji: item.title }),
				type: item.format,
				episodes: item.episodes,
				durationMinutes: 0,
				averageScore: 0,
				popularity: 0,
				season: "",
				airingStatus: "Finished airing",
				coverUrl: item.coverUrl,
				bannerUrl: "",
			})
			.onConflictDoUpdate({
				target: anime.id,
				set: {
					title: item.title,
					type: item.format,
					episodes: item.episodes,
					coverUrl: item.coverUrl,
				},
			});
	}
}

export async function upsertMediaList(
	db: Pick<DatabaseClient, "select" | "insert" | "update" | "delete">,
	entry: AnilistMediaList,
	titleLanguage: "Romaji" | "English" | "Native" = "Romaji",
): Promise<Pick<Anime, "id" | "coverUrl" | "bannerUrl"> | null> {
	const media = entry.media;
	if (!media) {
		return null;
	}

	const upserted = await upsertAnimeFromMedia(db, media, titleLanguage);
	const listRow = toListEntryRow(upserted.id, entry);
	const existingEntry = await db.select().from(listEntry).where(eq(listEntry.animeId, upserted.id)).limit(1);

	if (existingEntry[0]) {
		await db
			.update(listEntry)
			.set({
				...listRow,
				dateStarted: listRow.dateStarted ?? existingEntry[0].dateStarted,
				dateCompleted: listRow.dateCompleted ?? existingEntry[0].dateCompleted,
				started: listRow.started ?? existingEntry[0].started,
				completed: listRow.completed ?? existingEntry[0].completed,
			})
			.where(eq(listEntry.animeId, upserted.id));
	} else {
		await db.insert(listEntry).values(listRow);
	}

	return upserted;
}

function writeListChunk(db: DatabaseClient, entries: AnilistMediaList[], titleLanguage: TitleLanguage): { ids: number[] } {
	const animeRows: AnimeInsert[] = [];
	const listRows: ListEntryInsert[] = [];
	const ids: number[] = [];
	const seen = new Set<number>();
	for (const entry of entries) {
		if (!entry.media) {
			continue;
		}
		if (seen.has(entry.media.id)) {
			continue;
		}
		seen.add(entry.media.id);
		const row = toAnimeRow(entry.media, titleLanguage);
		animeRows.push(row);
		listRows.push(toListEntryRow(row.id, entry));
		ids.push(row.id);
	}
	if (animeRows.length === 0) {
		return { ids };
	}
	db.transaction((tx) => {
		for (const part of chunkRows(animeRows, INSERT_CHUNK)) {
			tx.insert(anime)
				.values(part)
				.onConflictDoUpdate({
					target: anime.id,
					set: {
						title: sql`excluded.title`,
						titles: sql`excluded.titles`,
						type: sql`excluded.type`,
						episodes: sql`excluded.episodes`,
						durationMinutes: sql`excluded.duration_minutes`,
						averageScore: sql`excluded.average_score`,
						popularity: sql`excluded.popularity`,
						ratedRank: sql`excluded.rated_rank`,
						popularRank: sql`excluded.popular_rank`,
						season: sql`excluded.season`,
						airingStatus: sql`excluded.airing_status`,
						genres: sql`excluded.genres`,
						tags: sql`excluded.tags`,
						producers: sql`excluded.producers`,
						synopsis: sql`excluded.synopsis`,
						lastAiredEpisode: sql`excluded.last_aired_episode`,
						nextAiringAt: sql`excluded.next_airing_at`,
						endDate: sql`excluded.end_date`,
						coverUrl: sql`excluded.cover_url`,
						bannerUrl: sql`excluded.banner_url`,
					},
				})
				.run();
		}
		for (const part of chunkRows(listRows, INSERT_CHUNK)) {
			tx.insert(listEntry)
				.values(part)
				.onConflictDoUpdate({
					target: listEntry.animeId,
					set: {
						status: sql`excluded.status`,
						episodesWatched: sql`excluded.episodes_watched`,
						score: sql`excluded.score`,
						started: sql`excluded.started`,
						completed: sql`excluded.completed`,
						lastUpdated: sql`excluded.last_updated`,
						timesRewatched: sql`excluded.times_rewatched`,
						rewatching: sql`excluded.rewatching`,
						notes: sql`excluded.notes`,
						dateStarted: sql`excluded.date_started`,
						dateCompleted: sql`excluded.date_completed`,
						anilistListId: sql`excluded.anilist_list_id`,
					},
				})
				.run();
		}
	});
	return { ids };
}

function deleteStaleListEntries(db: DatabaseClient, keepIds: number[]): void {
	db.transaction((tx) => {
		if (keepIds.length === 0) {
			tx.delete(listEntry).run();
			return;
		}
		tx.run(sql`create temp table if not exists anilist_list_keep (id integer primary key)`);
		tx.run(sql`delete from anilist_list_keep`);
		for (const part of chunkRows(keepIds, INSERT_CHUNK)) {
			tx.run(
				sql`insert into anilist_list_keep (id) values ${sql.join(
					part.map((id) => sql`(${id})`),
					sql`, `,
				)}`,
			);
		}
		tx.delete(listEntry).where(sql`${listEntry.animeId} not in (select id from anilist_list_keep)`).run();
	});
}

export async function syncAniListList(
	db: DatabaseClient,
	options: {
		token: string;
		userId: number;
		signal?: AbortSignal;
		onProgress?: (processed: number, wrote: number) => void;
	},
): Promise<number> {
	const { titleLanguage } = loadAppSettings();
	const syncedIds = new Set<number>();
	let processed = 0;
	await forEachMediaListChunk(
		{
			token: options.token,
			userId: options.userId,
			signal: options.signal,
		},
		(entries) => {
			if (options.signal?.aborted) {
				throw new DOMException("Aborted", "AbortError");
			}
			const written = writeListChunk(db, entries, titleLanguage);
			for (const id of written.ids) {
				syncedIds.add(id);
			}
			processed += entries.length;
			options.onProgress?.(processed, written.ids.length);
		},
	);
	if (options.signal?.aborted) {
		throw new DOMException("Aborted", "AbortError");
	}
	deleteStaleListEntries(db, [...syncedIds]);
	return syncedIds.size;
}

const LIVE_AIRING_STATUS = ["Currently airing", "Not yet released", "Hiatus"];
const LIVE_PAGE = 25;

export async function syncAniListLive(
	db: DatabaseClient,
	options: {
		token: string;
		signal?: AbortSignal;
	},
): Promise<number> {
	const { titleLanguage } = loadAppSettings();
	const listed = await db
		.select({ id: anime.id })
		.from(anime)
		.innerJoin(listEntry, eq(listEntry.animeId, anime.id))
		.where(or(inArray(anime.airingStatus, LIVE_AIRING_STATUS), isNotNull(anime.nextAiringAt)));
	const ids = [...new Set(listed.map((row) => row.id))];
	if (ids.length === 0) {
		return 0;
	}
	const staleAt = new Date().toISOString();
	let wrote = 0;
	for (const part of chunkRows(ids, LIVE_PAGE)) {
		if (options.signal?.aborted) {
			throw new DOMException("Aborted", "AbortError");
		}
		const data = await anilistGraphql<{ Page: unknown }>({
			query: GET_MEDIA_LIVE,
			variables: { ids: part, page: 1 },
			token: options.token,
			signal: options.signal,
		});
		const page = searchPageSchema.parse(data.Page);
		const patches: Array<{
			id: number;
			episodes: number;
			airingStatus: string;
			lastAiredEpisode: number;
			nextAiringAt: string | null;
			endDate: string | null;
			related: string;
			staleAt: string;
		}> = [];
		const relatedItems: RelatedMedia[] = [];
		for (const media of page.media ?? []) {
			if (!media) {
				continue;
			}
			const row = toAnimeRow(media, titleLanguage);
			const related = toRelatedMedia(media, titleLanguage);
			relatedItems.push(...related);
			patches.push({
				id: row.id,
				episodes: row.episodes,
				airingStatus: row.airingStatus,
				lastAiredEpisode: row.lastAiredEpisode,
				nextAiringAt: row.nextAiringAt,
				endDate: row.endDate,
				related: JSON.stringify(related),
				staleAt,
			});
		}
		if (patches.length === 0) {
			continue;
		}
		db.transaction((tx) => {
			for (const patch of patches) {
				const { id, ...set } = patch;
				tx.update(anime).set(set).where(eq(anime.id, id)).run();
			}
		});
		await upsertRelatedCatalog(db, relatedItems);
		wrote += patches.length;
	}
	return wrote;
}
