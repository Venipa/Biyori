import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { app, clipboard, dialog, nativeImage } from "electron";
import { z } from "zod";
import { mediaImageKindSchema } from "../../lib/schemas/media-image";
import { getOrFetchMediaImage, MediaCacheError, readCachedMediaImage } from "../covers/cache";
import { anime } from "../db/schema";
import { imageExtFromMime, runFileDialog, safeFileStem } from "../lib/file";
import { type TrpcContext, t } from "../trpc";

const mediaInput = z.object({
	animeId: z.number().int(),
	kind: mediaImageKindSchema.default("cover"),
	sourceUrl: z.url().optional(),
	coverUrl: z.url().optional(),
});

async function resolveMediaImage(ctx: TrpcContext, input: z.infer<typeof mediaInput>) {
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
}

export const coversRouter = t.router({
	/**
	 * Cache-first cover/banner bytes.
	 * Hit: media_cache row + file on disk (works even when anime not in list).
	 * Miss: resolve URL from local anime row or input.sourceUrl, download, save, return.
	 */
	get: t.procedure.input(mediaInput).query(async ({ ctx, input }) => {
		return resolveMediaImage(ctx, input);
	}),
	save: t.procedure.input(mediaInput.extend({ title: z.string().min(1) })).mutation(async ({ ctx, input }) => {
		const image = await resolveMediaImage(ctx, input);
		const ext = imageExtFromMime(image.mime);
		const result = await runFileDialog(ctx.getBrowserWindow(), () =>
			dialog.showSaveDialog({
				defaultPath: join(app.getPath("pictures"), `${safeFileStem(input.title, "poster")}.${ext}`),
				filters: [{ name: "Image", extensions: [ext] }],
			}),
		);
		if (result.canceled || !result.filePath) {
			return { ok: false as const, canceled: true as const };
		}
		await writeFile(result.filePath, Buffer.from(image.base64, "base64"));
		return { ok: true as const, canceled: false as const };
	}),
	copy: t.procedure.input(mediaInput).mutation(async ({ ctx, input }) => {
		const image = await resolveMediaImage(ctx, input);
		clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(image.base64, "base64")));
		return { ok: true as const };
	}),
});
