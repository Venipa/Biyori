import { z } from "zod";

/** Route search only. Do not transform: hash history re-parses strings and a
 * string->number transform makes TanStack Router rewrite in a tight loop. */
export const animeInfoSearchSchema = z.object({
	id: z.union([z.string(), z.number()]).optional(),
	infoTab: z.enum(["main", "list"]).optional(),
});

export type AnimeInfoSearch = z.infer<typeof animeInfoSearchSchema>;

export function parseAnimeInfoId(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
	}
	return undefined;
}
