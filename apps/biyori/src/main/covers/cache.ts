import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import type { MediaImageKind } from "../../lib/schemas/media-image";
import type { DatabaseClient } from "../db";
import { anime, mediaCache } from "../db/schema";
import { trackedFetch } from "../http-stats";
import { appCacheDir } from "../lib/app-paths";
import { isAllowedMediaUrl } from "./allowed-url";

export class MediaCacheError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MediaCacheError";
	}
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export type CachedMediaImage = {
	mime: string;
	bytes: Buffer;
};

function fileNameFor(kind: MediaImageKind, animeId: number, sourceUrl: string): string {
	const hash = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 16);
	return `${kind}-${animeId}-${hash}`;
}

async function downloadImage(kind: MediaImageKind, url: string): Promise<CachedMediaImage> {
	if (!isAllowedMediaUrl(kind, url)) {
		throw new MediaCacheError(`Prohibited ${kind} URL`);
	}
	const response = await trackedFetch(url, {
		headers: { Accept: "image/*", "User-Agent": "Biyori/1.0" },
	});
	if (!response.ok) {
		throw new MediaCacheError(`${kind} download failed (${response.status})`);
	}
	const mime = (response.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim().toLowerCase();
	if (!ALLOWED_MIME.has(mime)) {
		throw new MediaCacheError(`Unsupported ${kind} type: ${mime}`);
	}
	return { mime, bytes: Buffer.from(await response.arrayBuffer()) };
}

/**
 * Cache-first cover/banner bytes. The source URL is the local anime row's, else `fallbackUrl` (titles not in the list).
 * Hit: cached file whose source URL matches (or no URL known). Miss: download, replace the old file, upsert media_cache.
 */
export async function resolveMediaImage(db: DatabaseClient, input: { animeId: number; kind: MediaImageKind; fallbackUrl?: string }): Promise<CachedMediaImage> {
	const id = `${input.kind}:${input.animeId}`;
	const [cached] = await db.select().from(mediaCache).where(eq(mediaCache.id, id)).limit(1);
	const [row] = await db.select({ coverUrl: anime.coverUrl, bannerUrl: anime.bannerUrl }).from(anime).where(eq(anime.id, input.animeId)).limit(1);
	const sourceUrl = ((input.kind === "banner" ? row?.bannerUrl : row?.coverUrl) || input.fallbackUrl || "").trim();

	if (cached?.mime && cached.fileName && (!sourceUrl || cached.sourceUrl === sourceUrl)) {
		const file = join(appCacheDir(), cached.fileName);
		if (existsSync(file)) {
			return { mime: cached.mime, bytes: await readFile(file) };
		}
	}
	if (!sourceUrl) {
		throw new MediaCacheError(`No ${input.kind} URL to fetch`);
	}

	const downloaded = await downloadImage(input.kind, sourceUrl);
	const fileName = fileNameFor(input.kind, input.animeId, sourceUrl);
	if (cached?.fileName && cached.fileName !== fileName) {
		await rm(join(appCacheDir(), cached.fileName), { force: true });
	}
	await writeFile(join(appCacheDir(), fileName), downloaded.bytes);
	const fetchedAt = new Date().toISOString();
	await db
		.insert(mediaCache)
		.values({ id, kind: input.kind, animeId: input.animeId, sourceUrl, mime: downloaded.mime, fileName, fetchedAt })
		.onConflictDoUpdate({ target: mediaCache.id, set: { sourceUrl, mime: downloaded.mime, fileName, fetchedAt } });
	return downloaded;
}
