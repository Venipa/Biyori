import { createHash } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import type { MediaImageKind } from "../../lib/schemas/media-image";
import type { DatabaseClient } from "../db";
import { mediaCache } from "../db/schema";
import { trackedFetch } from "../http-stats";
import { appCacheDir } from "../lib/app-paths";

const ALLOWED_MIME = new Set([
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
]);

const HOST_PATH = {
	cover: /^s\d\.anilist\.co\/file\/anilistcdn\/media\/anime\/(cover|poster)/,
	banner: /^s\d\.anilist\.co\/file\/anilistcdn\/media\/anime\/banner/,
} as const;

export class MediaCacheError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MediaCacheError";
	}
}

export class CoverCacheError extends MediaCacheError {
	constructor(message: string) {
		super(message);
		this.name = "CoverCacheError";
	}
}

function cacheDir(): string {
	return appCacheDir();
}

function rowId(kind: MediaImageKind, animeId: number): string {
	return `${kind}:${animeId}`;
}

function fileNameFor(
	kind: MediaImageKind,
	animeId: number,
	sourceUrl: string,
): string {
	const hash = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 16);
	return `${kind}-${animeId}-${hash}`;
}

export function isAllowedMediaUrl(kind: MediaImageKind, rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		if (url.protocol !== "https:") {
			return false;
		}
		return HOST_PATH[kind].test(url.hostname + url.pathname);
	} catch {
		return false;
	}
}

export function isAllowedCoverUrl(rawUrl: string): boolean {
	return isAllowedMediaUrl("cover", rawUrl);
}

async function downloadImage(
	kind: MediaImageKind,
	url: string,
): Promise<{ mime: string; bytes: Buffer }> {
	if (!isAllowedMediaUrl(kind, url)) {
		throw new MediaCacheError(`Prohibited ${kind} URL`);
	}
	const response = await trackedFetch(url, {
		headers: { Accept: "image/*", "User-Agent": "Biyori/1.0" },
	});
	if (!response.ok) {
		throw new MediaCacheError(`${kind} download failed (${response.status})`);
	}
	const mime = (response.headers.get("content-type") ?? "image/jpeg")
		.split(";")[0]
		.trim()
		.toLowerCase();
	if (!ALLOWED_MIME.has(mime)) {
		throw new MediaCacheError(`Unsupported ${kind} type: ${mime}`);
	}
	return { mime, bytes: Buffer.from(await response.arrayBuffer()) };
}

export type CachedMediaImage = {
	mime: string;
	base64: string;
	fromCache: boolean;
};

/** Read disk+db cache by kind+animeId. No network. */
export async function readCachedMediaImage(options: {
	db: DatabaseClient;
	animeId: number;
	kind: MediaImageKind;
}): Promise<CachedMediaImage | null> {
	const id = rowId(options.kind, options.animeId);
	const rows = await options.db
		.select()
		.from(mediaCache)
		.where(eq(mediaCache.id, id))
		.limit(1);
	const existing = rows[0];
	if (!existing?.mime || !existing.fileName) {
		return null;
	}
	const file = join(cacheDir(), existing.fileName);
	if (!existsSync(file)) {
		return null;
	}
	const bytes = readFileSync(file);
	return {
		mime: existing.mime,
		base64: bytes.toString("base64"),
		fromCache: true,
	};
}

/**
 * Cache-first media pipeline:
 * 1. if file cache hit and (no sourceUrl / same sourceUrl) -> return file
 * 2. else download sourceUrl, write file, upsert media_cache, return bytes
 */
export async function getOrFetchMediaImage(options: {
	db: DatabaseClient;
	animeId: number;
	kind: MediaImageKind;
	sourceUrl?: string;
}): Promise<CachedMediaImage> {
	const id = rowId(options.kind, options.animeId);
	const rows = await options.db
		.select()
		.from(mediaCache)
		.where(eq(mediaCache.id, id))
		.limit(1);
	const existing = rows[0];
	const sourceUrl = options.sourceUrl?.trim() || "";

	if (existing?.mime && existing.fileName) {
		const file = join(cacheDir(), existing.fileName);
		const urlMatches =
			!sourceUrl || existing.sourceUrl === sourceUrl;
		if (urlMatches && existsSync(file)) {
			const bytes = readFileSync(file);
			return {
				mime: existing.mime,
				base64: bytes.toString("base64"),
				fromCache: true,
			};
		}
	}

	if (!sourceUrl) {
		throw new MediaCacheError(`No ${options.kind} URL to fetch`);
	}

	const downloaded = await downloadImage(options.kind, sourceUrl);
	const fileName = fileNameFor(options.kind, options.animeId, sourceUrl);
	if (existing && existing.fileName !== fileName) {
		const oldFile = join(cacheDir(), existing.fileName);
		if (existsSync(oldFile)) {
			unlinkSync(oldFile);
		}
	}
	writeFileSync(join(cacheDir(), fileName), downloaded.bytes);
	const fetchedAt = new Date().toISOString();
	await options.db
		.insert(mediaCache)
		.values({
			id,
			kind: options.kind,
			animeId: options.animeId,
			sourceUrl,
			mime: downloaded.mime,
			fileName,
			fetchedAt,
		})
		.onConflictDoUpdate({
			target: mediaCache.id,
			set: {
				sourceUrl,
				mime: downloaded.mime,
				fileName,
				fetchedAt,
			},
		});
	return {
		mime: downloaded.mime,
		base64: downloaded.bytes.toString("base64"),
		fromCache: false,
	};
}

export async function getOrFetchCover(options: {
	db: DatabaseClient;
	animeId: number;
	coverUrl: string;
}): Promise<CachedMediaImage> {
	return getOrFetchMediaImage({
		db: options.db,
		animeId: options.animeId,
		kind: "cover",
		sourceUrl: options.coverUrl,
	});
}
