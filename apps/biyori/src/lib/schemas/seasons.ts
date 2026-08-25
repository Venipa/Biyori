import { z } from "zod";
import { anilistMediaCardSchema } from "./anilist-media-card";

export {
	type AnilistMediaCard as SeasonItem,
	type AnilistMediaCardCached as SeasonItemCached,
	type AnilistMediaTitles as SeasonTitles,
	anilistMediaCardSchema as seasonItemSchema,
	anilistMediaTitlesSchema as seasonTitlesSchema,
} from "./anilist-media-card";

export const anilistSeasonNameSchema = z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]);

export const seasonGroupBySchema = z.enum(["airing", "list", "type"]);
export const seasonSortBySchema = z.enum(["date", "episodes", "popularity", "score", "title"]);
export const seasonViewAsSchema = z.enum(["tiles", "images"]);

export const seasonCacheFileSchema = z.object({
	season: anilistSeasonNameSchema,
	seasonYear: z.number().int(),
	fetchedAt: z.string(),
	items: z.array(anilistMediaCardSchema),
});

export type AnilistSeasonName = z.infer<typeof anilistSeasonNameSchema>;
export type SeasonGroupBy = z.infer<typeof seasonGroupBySchema>;
export type SeasonSortBy = z.infer<typeof seasonSortBySchema>;
export type SeasonViewAs = z.infer<typeof seasonViewAsSchema>;
export type SeasonCacheFile = z.infer<typeof seasonCacheFileSchema>;
