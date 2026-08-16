import { z } from "zod";

export const anilistMediaTitlesSchema = z.object({
	romaji: z.string(),
	english: z.string(),
	native: z.string(),
});

/** Shared discover card: seasons + search grids. */
export const anilistMediaCardSchema = z.object({
	id: z.number().int(),
	titles: anilistMediaTitlesSchema,
	coverUrl: z.string(),
	bannerUrl: z.string(),
	episodes: z.number().int(),
	format: z.string(),
	status: z.string(),
	season: z.string(),
	seasonYear: z.number().int().nullable(),
	averageScore: z.number(),
	popularity: z.number().int(),
	genres: z.array(z.string()),
	producers: z.array(z.string()),
	synopsis: z.string(),
	startDate: z.string().nullable(),
	endDate: z.string().nullable(),
	trailerId: z.string().nullable(),
	isAdult: z.boolean().default(false),
});

export type AnilistMediaTitles = z.infer<typeof anilistMediaTitlesSchema>;
export type AnilistMediaCardCached = z.infer<typeof anilistMediaCardSchema>;
export type AnilistMediaCard = AnilistMediaCardCached & { title: string };
