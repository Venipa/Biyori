import { eq } from "drizzle-orm";
import { isAnimeStale } from "../../lib/anime-stale";
import { parseStoredTitles, stringifyMediaTitles } from "../../lib/anime-titles";
import { withMediaCardTitle } from "../anilist/map";
import { deleteStaleListEntries } from "../anilist/sync";
import type { DatabaseClient } from "../db";
import { anime, listEntry } from "../db/schema";
import type { AnimeInsert } from "../db/types";
import { malRequest } from "../mal/client";
import {
	MAL_ANIME_FIELDS,
	type MalAnimeNode,
	malAnimeNodeSchema,
	malListEntryRow,
	malListPageSchema,
	malListStatusSchema,
	malUserSchema,
	toMalAnimeRow,
	toMalCard,
	toMalRelated,
	toMalStatus,
} from "../mal/map";
import { readMalAuth, withMalToken, writeMalAuth } from "../mal/store";
import { loadAppSettings } from "../settings";
import type { EntryPatch, ListProvider } from "./types";

const LIST_FIELDS = `${MAL_ANIME_FIELDS},list_status{status,score,num_episodes_watched,is_rewatching,start_date,finish_date,num_times_rewatched,comments,updated_at}`;
const SEARCH_LIMIT = 30;
const SEASON_LIMIT = 100;
const MAL_SEASON: Record<string, string> = { WINTER: "winter", SPRING: "spring", SUMMER: "summer", FALL: "fall" };

function get(path: string, signal?: AbortSignal): Promise<unknown> {
	return withMalToken((token) => malRequest({ path, token, signal }));
}

/** Catalog columns only, so library links (folder, fansub, synonyms) survive refreshes. */
function upsertAnimeRow(db: Pick<DatabaseClient, "insert">, row: AnimeInsert & { id: number }): void {
	const { id: _id, ...catalog } = row;
	db.insert(anime).values(row).onConflictDoUpdate({ target: anime.id, set: catalog }).run();
}

async function* pages(first: string, signal?: AbortSignal): AsyncGenerator<MalAnimeNode[]> {
	let next: string | undefined = first;
	while (next) {
		const body = (await get(next, signal)) as { data?: { node: unknown }[]; paging?: { next?: string } };
		yield (body.data ?? []).map((item) => malAnimeNodeSchema.parse(item.node));
		next = body.paging?.next;
	}
}

function patchForm(patch: EntryPatch): Record<string, string> {
	return {
		status: toMalStatus(patch.status),
		is_rewatching: String(patch.rewatching),
		num_watched_episodes: String(patch.progress),
		score: String(Math.round((patch.score ?? 0) / 10)),
		num_times_rewatched: String(patch.timesRewatched),
		comments: patch.notes,
		...(patch.dateStarted ? { start_date: patch.dateStarted } : {}),
		...(patch.dateCompleted ? { finish_date: patch.dateCompleted } : {}),
	};
}

async function saveStatus(animeId: number, form: Record<string, string>) {
	const body = await withMalToken((token) => malRequest({ path: `/anime/${animeId}/my_list_status`, token, method: "PATCH", form }));
	return malListEntryRow(animeId, malListStatusSchema.parse(body));
}

export const myAnimeListProvider: ListProvider = {
	service: "myanimelist",
	relationsColumn: 0,
	isConnected: () => readMalAuth() != null,
	async refreshProfile(signal) {
		const auth = readMalAuth();
		if (!auth) {
			throw new Error("MyAnimeList is not connected");
		}
		const user = malUserSchema.parse(await get("/users/@me?fields=picture", signal));
		writeMalAuth({ ...(readMalAuth() ?? auth), username: user.name, avatarUrl: user.picture ?? "" });
	},
	async importList(db, options) {
		const { titleLanguage } = loadAppSettings();
		const keep: number[] = [];
		let next: string | undefined = `/users/@me/animelist?fields=${encodeURIComponent(LIST_FIELDS)}&limit=1000&nsfw=true`;
		while (next) {
			const page = malListPageSchema.parse(await get(next, options.signal));
			db.transaction((tx) => {
				for (const item of page.data) {
					upsertAnimeRow(tx, toMalAnimeRow(item.node, titleLanguage));
					const entry = malListEntryRow(item.node.id, item.list_status);
					tx.insert(listEntry).values(entry).onConflictDoUpdate({ target: listEntry.animeId, set: entry }).run();
					keep.push(item.node.id);
				}
			});
			options.onProgress?.(keep.length, page.data.length);
			next = page.paging?.next;
		}
		deleteStaleListEntries(db, keep);
		return keep.length;
	},
	saveEntry: (animeId, patch) => saveStatus(animeId, patchForm(patch)),
	async addEntry(db, animeId, status) {
		await myAnimeListProvider.ensureAnime(db, animeId);
		const entry = await saveStatus(animeId, { status: toMalStatus(status) });
		db.insert(listEntry).values(entry).onConflictDoUpdate({ target: listEntry.animeId, set: entry }).run();
	},
	async ensureAnime(db, id, signal) {
		const existing = db.select({ titles: anime.titles, staleAt: anime.staleAt }).from(anime).where(eq(anime.id, id)).get();
		if (existing && parseStoredTitles(existing.titles) && !isAnimeStale(existing.staleAt)) {
			return { id };
		}
		const node = malAnimeNodeSchema.parse(await get(`/anime/${id}?fields=${MAL_ANIME_FIELDS},related_anime`, signal));
		const related = toMalRelated(node);
		upsertAnimeRow(db, { ...toMalAnimeRow(node, loadAppSettings().titleLanguage), related: JSON.stringify(related), staleAt: new Date().toISOString() });
		// stub rows so related titles open; full data loads when visited
		for (const item of related) {
			db.insert(anime)
				.values({
					id: item.id,
					title: item.title,
					titles: stringifyMediaTitles({ romaji: item.title }),
					type: "TV",
					episodes: 0,
					averageScore: 0,
					season: "",
					airingStatus: "Finished airing",
					coverUrl: item.coverUrl,
				})
				.onConflictDoNothing()
				.run();
		}
		return { id };
	},
	async search(query, page) {
		const { titleLanguage } = loadAppSettings();
		const offset = (page - 1) * SEARCH_LIMIT;
		const body = (await get(`/anime?q=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}&offset=${offset}&nsfw=true&fields=${MAL_ANIME_FIELDS}`)) as {
			data?: { node: unknown }[];
			paging?: { next?: string };
		};
		const items = (body.data ?? []).map((item) => withMediaCardTitle(toMalCard(malAnimeNodeSchema.parse(item.node)), titleLanguage));
		return { items, hasNextPage: Boolean(body.paging?.next) };
	},
	async seasonItems(season, year, signal) {
		const items: ReturnType<typeof toMalCard>[] = [];
		for await (const nodes of pages(`/anime/season/${year}/${MAL_SEASON[season]}?limit=${SEASON_LIMIT}&nsfw=true&fields=${MAL_ANIME_FIELDS}`, signal)) {
			items.push(...nodes.map(toMalCard));
		}
		return items;
	},
};
