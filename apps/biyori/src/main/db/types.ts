import type {
	anime,
	appSetting,
	episodeFile,
	history,
	listEntry,
	mediaCache,
	relationsCache,
	syncQueue,
	torrentArchive,
} from "./schema";

export type Anime = typeof anime.$inferSelect;
export type AnimeInsert = typeof anime.$inferInsert;

export type ListEntry = typeof listEntry.$inferSelect;
export type ListEntryInsert = typeof listEntry.$inferInsert;

export type History = typeof history.$inferSelect;
export type HistoryInsert = typeof history.$inferInsert;

export type AppSetting = typeof appSetting.$inferSelect;
export type AppSettingInsert = typeof appSetting.$inferInsert;

export type EpisodeFile = typeof episodeFile.$inferSelect;
export type EpisodeFileInsert = typeof episodeFile.$inferInsert;

export type SyncQueue = typeof syncQueue.$inferSelect;
export type SyncQueueInsert = typeof syncQueue.$inferInsert;

export type TorrentArchive = typeof torrentArchive.$inferSelect;
export type TorrentArchiveInsert = typeof torrentArchive.$inferInsert;

export type RelationsCache = typeof relationsCache.$inferSelect;
export type RelationsCacheInsert = typeof relationsCache.$inferInsert;

export type MediaCache = typeof mediaCache.$inferSelect;
export type MediaCacheInsert = typeof mediaCache.$inferInsert;
