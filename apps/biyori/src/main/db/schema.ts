import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

type AnimeType = string;
/**
 * Catalog row, filled by the active list provider. Each service has its own DB file,
 * so PK is that service's media id. Fields a provider lacks stay null / empty.
 */
export const anime = sqliteTable("anime", {
	id: integer("id").primaryKey(),
	title: text("title").notNull(),
	titles: text("titles").notNull().default("{}"),
	userSynonyms: text("user_synonyms").notNull().default(""),
	type: text("type").notNull().$type<AnimeType>(),
	episodes: integer("episodes").notNull(),
	durationMinutes: integer("duration_minutes").notNull().default(0),
	/** 0-100 regardless of provider */
	averageScore: integer("average_score").notNull(),
	popularity: integer("popularity").notNull().default(0),
	ratedRank: integer("rated_rank"),
	popularRank: integer("popular_rank"),
	season: text("season").notNull(),
	airingStatus: text("airing_status").notNull(),
	genres: text("genres").notNull().default("[]"),
	tags: text("tags").notNull().default("[]"),
	producers: text("producers").notNull().default("[]"),
	synopsis: text("synopsis").notNull().default(""),
	folder: text("folder").notNull().default(""),
	fansub: text("fansub").notNull().default(""),
	lastAiredEpisode: integer("last_aired_episode").notNull().default(0),
	nextAiringAt: text("next_airing_at"),
	/** weekly slot text when the provider has no exact airing time (MAL) */
	broadcast: text("broadcast"),
	startDate: text("start_date"),
	endDate: text("end_date"),
	coverUrl: text("cover_url").notNull().default(""),
	bannerUrl: text("banner_url").notNull().default(""),
	staleAt: text("stale_at"),
	related: text("related").notNull().default("[]"),
});

export const listEntry = sqliteTable("list_entry", {
	animeId: integer("anime_id")
		.primaryKey()
		.references(() => anime.id),
	status: text("status").notNull(),
	episodesWatched: integer("episodes_watched").notNull(),
	score: integer("score"),
	started: text("started"),
	completed: text("completed"),
	lastUpdated: text("last_updated").notNull(),
	timesRewatched: integer("times_rewatched").notNull().default(0),
	rewatching: integer("rewatching").notNull().default(0),
	notes: text("notes").notNull().default(""),
	dateStarted: text("date_started"),
	dateCompleted: text("date_completed"),
	/** provider-side list entry id when it has one (AniList) */
	remoteEntryId: integer("remote_entry_id"),
});

export const history = sqliteTable("history", {
	id: text("id").primaryKey(),
	animeId: integer("anime_id").notNull().default(0),
	title: text("title").notNull(),
	episode: integer("episode").notNull(),
	lastModified: text("last_modified").notNull(),
	kind: text("kind").notNull(),
	advanced: integer("advanced").notNull().default(0),
	/** JSON `HistoryChanges`: what this update changed; "{}" for rows written before it existed */
	changes: text("changes").notNull().default("{}"),
});

export const appSetting = sqliteTable("app_setting", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
});

export const episodeFile = sqliteTable("episode_file", {
	id: text("id").primaryKey(),
	animeId: integer("anime_id")
		.notNull()
		.references(() => anime.id),
	episode: integer("episode").notNull(),
	path: text("path").notNull().unique(),
	size: integer("size").notNull(),
	createdAt: text("created_at").notNull(),
});

export const syncQueue = sqliteTable("sync_queue", {
	animeId: integer("anime_id")
		.primaryKey()
		.references(() => anime.id),
	mode: text("mode").notNull(),
	payload: text("payload").notNull(),
	createdAt: text("created_at").notNull(),
});

export const torrentArchive = sqliteTable("torrent_archive", {
	guid: text("guid").primaryKey(),
	title: text("title").notNull(),
	link: text("link").notNull(),
	matched: integer("matched").notNull().default(0),
	seenAt: text("seen_at").notNull(),
});

export const relationsCache = sqliteTable("relations_cache", {
	id: text("id").primaryKey(),
	body: text("body").notNull(),
	fetchedAt: text("fetched_at").notNull(),
});

export const mediaCache = sqliteTable("media_cache", {
	id: text("id").primaryKey(),
	kind: text("kind").notNull(),
	animeId: integer("anime_id").notNull(),
	sourceUrl: text("source_url").notNull(),
	mime: text("mime").notNull(),
	fileName: text("file_name").notNull(),
	fetchedAt: text("fetched_at").notNull(),
});

export const activity = sqliteTable("activity", {
	id: text("id").primaryKey(),
	kind: text("kind").notNull(),
	source: text("source").notNull(),
	title: text("title").notNull(),
	body: text("body").notNull().default(""),
	status: text("status").notNull(),
	createdAt: text("created_at").notNull(),
});
