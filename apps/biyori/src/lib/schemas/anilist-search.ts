import { z } from "zod";
import { animeInfoSearchSchema } from "./anime-info-search";

/** Toolbar / navigate-to-search form (empty submit is a no-op). */
export const anilistSearchFormSchema = z.object({
	q: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string()),
});

/** API search procedure input. */
export const anilistSearchSchema = anilistSearchFormSchema.extend({
	q: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string().trim().min(1, "Required")),
	page: z.coerce.number().int().min(1).default(1),
});

export const anilistSearchRouteSchema = animeInfoSearchSchema.extend({
	q: z.string().optional(),
});

export type AnilistSearchFormInput = z.input<typeof anilistSearchFormSchema>;
export type AnilistSearchForm = z.output<typeof anilistSearchFormSchema>;
export type AnilistSearchInput = z.input<typeof anilistSearchSchema>;
export type AnilistSearch = z.output<typeof anilistSearchSchema>;
