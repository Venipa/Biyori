import { z } from "zod";

export const animeInfoSearchSchema = z.object({
	id: z
		.union([z.string(), z.number()])
		.optional()
		.transform((value) => {
			if (value === undefined) {
				return undefined;
			}
			const parsed = typeof value === "number" ? value : Number(value);
			return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
		}),
	infoTab: z.enum(["main", "list"]).optional(),
});

export type AnimeInfoSearch = z.infer<typeof animeInfoSearchSchema>;
