import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { mediaImageKindSchema } from "../../lib/schemas/media-image";
import { getOrFetchMediaImage, MediaCacheError, readCachedMediaImage } from "../covers/cache";
import { anime } from "../db/schema";
import { t } from "../trpc";

export const coversRouter = t.router({
	/**
	 * Cache-first cover/banner bytes.
	 * Hit: media_cache row + file on disk (works even when anime not in list).
	 * Miss: resolve URL from local anime row or input.sourceUrl, download, save, return.
	 */
	get: t.procedure
		.input(
			z.object({
				animeId: z.number().int(),
				kind: mediaImageKindSchema.default("cover"),
				sourceUrl: z.url().optional(),
				coverUrl: z.url().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const inputUrl = input.sourceUrl || (input.kind === "cover" ? input.coverUrl : undefined) || "";

			if (!inputUrl) {
				const cached = await readCachedMediaImage({
					db: ctx.db,
					animeId: input.animeId,
					kind: input.kind,
				});
				if (cached) {
					return cached;
				}
			}

			const rows = await ctx.db
				.select({
					coverUrl: anime.coverUrl,
					bannerUrl: anime.bannerUrl,
				})
				.from(anime)
				.where(eq(anime.id, input.animeId))
				.limit(1);
			const stored = input.kind === "banner" ? rows[0]?.bannerUrl : rows[0]?.coverUrl;
			const sourceUrl = (stored || inputUrl).trim();

			try {
				return await getOrFetchMediaImage({
					db: ctx.db,
					animeId: input.animeId,
					kind: input.kind,
					sourceUrl: sourceUrl || undefined,
				});
			} catch (error) {
				if (error instanceof MediaCacheError) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: error.message,
					});
				}
				throw error;
			}
		}),
});
