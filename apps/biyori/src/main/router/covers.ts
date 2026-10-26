import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TRPCError } from "@trpc/server";
import { app, clipboard, dialog, nativeImage } from "electron";
import { z } from "zod";
import { mediaImageKindSchema } from "../../lib/schemas/media-image";
import { MediaCacheError, resolveMediaImage } from "../covers/cache";
import { imageExtFromMime, runFileDialog, safeFileStem } from "../lib/file";
import { type TrpcContext, t } from "../trpc";

// display goes through the biyori-media:// protocol (covers/protocol.ts); these are the byte-level actions
const mediaInput = z.object({
	animeId: z.number().int(),
	kind: mediaImageKindSchema.default("cover"),
	sourceUrl: z.url().optional(),
	coverUrl: z.url().optional(),
});

async function resolveOrThrow(ctx: TrpcContext, input: z.infer<typeof mediaInput>) {
	try {
		return await resolveMediaImage(ctx.db, {
			animeId: input.animeId,
			kind: input.kind,
			fallbackUrl: input.sourceUrl || (input.kind === "cover" ? input.coverUrl : undefined),
		});
	} catch (error) {
		if (error instanceof MediaCacheError) {
			throw new TRPCError({ code: "NOT_FOUND", message: error.message });
		}
		throw error;
	}
}

export const coversRouter = t.router({
	save: t.procedure.input(mediaInput.extend({ title: z.string().min(1) })).mutation(async ({ ctx, input }) => {
		const image = await resolveOrThrow(ctx, input);
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
		await writeFile(result.filePath, image.bytes);
		return { ok: true as const, canceled: false as const };
	}),
	copy: t.procedure.input(mediaInput).mutation(async ({ ctx, input }) => {
		const image = await resolveOrThrow(ctx, input);
		clipboard.writeImage(nativeImage.createFromBuffer(image.bytes));
		return { ok: true as const };
	}),
});
