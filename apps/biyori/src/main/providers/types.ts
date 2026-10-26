import type { AnilistMediaCard } from "../../lib/schemas/anilist-media-card";
import type { AnilistSeasonName, SeasonItemCached } from "../../lib/schemas/seasons";
import type { ListStatus } from "../../shared/list";
import type { DatabaseClient } from "../db";
import type { ListEntryInsert } from "../db/types";
import type { AccountService } from "../stores";

/** Full desired state of one list entry, in the account's own score scale. */
export type EntryPatch = {
	status: ListStatus;
	rewatching: boolean;
	progress: number;
	score: number | null;
	timesRewatched: number;
	notes: string;
	dateStarted: string | null;
	dateCompleted: string | null;
};

/**
 * One list service. Fills the unified schema from its own API so a service's DB
 * never depends on another provider's data or rate limits.
 */
export interface ListProvider {
	readonly service: AccountService;
	/** column of erengy/anime-relations ids (mal|kitsu|anilist) matching this service's ids */
	readonly relationsColumn: number;
	isConnected(): boolean;
	/** Refreshes the stored profile (name, avatar, score format). */
	refreshProfile(signal?: AbortSignal): Promise<void>;
	importList(db: DatabaseClient, options: { signal?: AbortSignal; onProgress?: (processed: number, wrote: number) => void }): Promise<number>;
	saveEntry(animeId: number, patch: EntryPatch): Promise<ListEntryInsert>;
	addEntry(db: DatabaseClient, animeId: number, status: ListStatus): Promise<void>;
	ensureAnime(db: DatabaseClient, id: number, signal?: AbortSignal): Promise<{ id: number }>;
	search(query: string, page: number): Promise<{ items: AnilistMediaCard[]; hasNextPage: boolean }>;
	seasonItems(season: AnilistSeasonName, year: number, signal?: AbortSignal): Promise<SeasonItemCached[]>;
	/** Exact airing times; providers without them omit this. */
	refreshAiring?(db: DatabaseClient, signal?: AbortSignal): Promise<number>;
}
