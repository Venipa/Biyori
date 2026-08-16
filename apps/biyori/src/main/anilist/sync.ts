import { eq, notInArray } from "drizzle-orm";
import type { DatabaseClient } from "../db";
import type { Anime } from "../db/types";
import { anime, listEntry } from "../db/schema";
import type { AnilistSeasonName, SeasonItem } from "../../lib/schemas/seasons";
import { anilistGraphql } from "./client";
import {
	anilistMediaListSchema,
	anilistMediaSchema,
	mediaListCollectionSchema,
	searchPageSchema,
	toAnimeRow,
	toListEntryRow,
	toMediaCard,
	toMediaCardCached,
	viewerSchema,
	withMediaCardTitle,
	type AnilistMedia,
	type AnilistMediaList,
	type AnilistMediaStatus,
} from "./map";
import {
	GET_ALL_ANIMES_FROM_UID,
	GET_CURRENT_USER,
	GET_MEDIA_BY_ID,
	SAVE_MEDIA_LIST_ENTRY,
	SEARCH_MEDIA,
	SEASON_MEDIA,
} from "./queries";
import { readSeasonCache, writeSeasonCache } from "./season-cache";

const UPSERT_YIELD_EVERY = 4;

function yieldToEventLoop(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

export async function fetchViewer(
	token: string,
	signal?: AbortSignal,
): Promise<{
	id: number;
	name: string;
}> {
	const data = await anilistGraphql<{ Viewer: unknown }>({
		query: GET_CURRENT_USER,
		token,
		signal,
	});
	return viewerSchema.parse(data.Viewer);
}

export async function fetchMediaListCollection(options: {
	token: string;
	userId: number;
	signal?: AbortSignal;
}): Promise<AnilistMediaList[]> {
	const entries: AnilistMediaList[] = [];
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
		for (const list of collection.lists ?? []) {
			for (const entry of list?.entries ?? []) {
				if (!entry) {
					continue;
				}
				entries.push(entry);
			}
		}
		if (!collection.hasNextChunk) {
			break;
		}
		chunk += 1;
	}
	return entries;
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
	const items = (page.media ?? [])
		.filter((item): item is AnilistMedia => Boolean(item))
		.map((item) => toMediaCard(item, options.titleLanguage));
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
	const resolve = (items: Parameters<typeof withMediaCardTitle>[0][]) =>
		items.map((item) => withMediaCardTitle(item, options.titleLanguage));

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
): Promise<Pick<Anime, "id" | "coverUrl" | "bannerUrl">> {
	const animeRow = toAnimeRow(media, titleLanguage);
	const existing = await db
		.select({ id: anime.id })
		.from(anime)
		.where(eq(anime.id, media.id))
		.limit(1);

	if (existing[0]) {
		await db
			.update(anime)
			.set({
				title: animeRow.title,
				alternativeTitles: animeRow.alternativeTitles,
				type: animeRow.type,
				episodes: animeRow.episodes,
				averageScore: animeRow.averageScore,
				season: animeRow.season,
				airingStatus: animeRow.airingStatus,
				genres: animeRow.genres,
				producers: animeRow.producers,
				synopsis: animeRow.synopsis,
				lastAiredEpisode: animeRow.lastAiredEpisode,
				coverUrl: animeRow.coverUrl,
				bannerUrl: animeRow.bannerUrl,
			})
			.where(eq(anime.id, media.id));
	} else {
		await db.insert(anime).values(animeRow);
	}

	return {
		id: media.id,
		coverUrl: animeRow.coverUrl || "",
		bannerUrl: animeRow.bannerUrl || "",
	} satisfies Pick<Anime, "id" | "coverUrl" | "bannerUrl">;
}

/** Cache-only: anime row, no listEntry. Fetch AniList if missing. */
export async function ensureAnimeCached(options: {
	db: Pick<DatabaseClient, "select" | "insert" | "update">;
	id: number;
	token?: string;
	titleLanguage: "Romaji" | "English" | "Native";
	signal?: AbortSignal;
}): Promise<{ id: number }> {
	const existing = await options.db
		.select({ id: anime.id })
		.from(anime)
		.where(eq(anime.id, options.id))
		.limit(1);
	if (existing[0]) {
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
	const upserted = await upsertAnimeFromMedia(
		options.db,
		media,
		options.titleLanguage,
	);
	return { id: upserted.id };
}

export async function upsertMediaList(
	db: Pick<DatabaseClient, "select" | "insert" | "update" | "delete">,
	entry: AnilistMediaList,
	titleLanguage: "Romaji" | "English" | "Native" = "Romaji",
): Promise<Pick<Anime, "id" | "coverUrl" | "bannerUrl"> | null> {
	const media = entry.media ? anilistMediaSchema.parse(entry.media) : null;
	if (!media) {
		return null;
	}

	const upserted = await upsertAnimeFromMedia(db, media, titleLanguage);
	const listRow = toListEntryRow(upserted.id, entry);
	const existingEntry = await db
		.select()
		.from(listEntry)
		.where(eq(listEntry.animeId, upserted.id))
		.limit(1);

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

export async function syncAniListList(
	db: DatabaseClient,
	options: {
		token: string;
		userId: number;
		signal?: AbortSignal;
		onProgress?: (processed: number, total: number) => void;
	},
): Promise<Array<Pick<Anime, "id" | "coverUrl" | "bannerUrl">>> {
	const entries = await fetchMediaListCollection({
		token: options.token,
		userId: options.userId,
		signal: options.signal,
	});
	const total = entries.length;
	options.onProgress?.(0, total);
	const covers: Array<Pick<Anime, "id" | "coverUrl" | "bannerUrl">> = [];
	const syncedIds: number[] = [];
	let processed = 0;
	for (const entry of entries) {
		if (options.signal?.aborted) {
			throw new DOMException("Aborted", "AbortError");
		}
		const upserted = await upsertMediaList(db, entry);
		if (upserted) {
			syncedIds.push(upserted.id);
			if (upserted.coverUrl || upserted.bannerUrl) {
				covers.push({
					id: upserted.id,
					coverUrl: upserted.coverUrl,
					bannerUrl: upserted.bannerUrl,
				});
			}
		}
		processed += 1;
		options.onProgress?.(processed, total);
		if (processed % UPSERT_YIELD_EVERY === 0) {
			await yieldToEventLoop();
		}
	}
	const staleListed =
		syncedIds.length === 0
			? []
			: await db
					.select({ animeId: listEntry.animeId })
					.from(listEntry)
					.where(notInArray(listEntry.animeId, syncedIds));
	for (let i = 0; i < staleListed.length; i += 1) {
		await db
			.delete(listEntry)
			.where(eq(listEntry.animeId, staleListed[i].animeId));
		if (i % UPSERT_YIELD_EVERY === 0) {
			await yieldToEventLoop();
		}
	}
	return covers;
}
