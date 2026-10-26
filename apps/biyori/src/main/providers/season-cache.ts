import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SeasonCacheFile, SeasonItemCached } from "../../lib/schemas/seasons";
import { type AnilistSeasonName, seasonCacheFileSchema } from "../../lib/schemas/seasons";
import { appCacheDir } from "../lib/app-paths";
import { decryptWithSafeStorage, encryptWithSafeStorage } from "../lib/safe-storage";
import { credentialsStore } from "../stores";

/** per service: seasons/<service>/ — catalogs (and ids) differ between providers */
function seasonsDir(): string {
	const dir = join(appCacheDir(), "seasons", credentialsStore.get("activeAccount")?.service ?? "anilist");
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function seasonCachePath(season: AnilistSeasonName, seasonYear: number): string {
	return join(seasonsDir(), `${season}-${seasonYear}.data`);
}

function parseSeasonCache(raw: unknown): SeasonCacheFile | null {
	if (raw && typeof raw === "object" && "items" in raw && Array.isArray(raw.items) && raw.items.some((item) => item != null && typeof item === "object" && !("isAdult" in item))) {
		return null;
	}
	const parsed = seasonCacheFileSchema.safeParse(raw);
	return parsed.success ? parsed.data : null;
}

function encryptSeasonCache(payload: SeasonCacheFile): Buffer {
	return encryptWithSafeStorage(JSON.stringify(payload));
}

// decrypted copies per season file; the encrypted file stays the tamper-proof source of truth
const memory = new Map<string, SeasonCacheFile>();

export async function readSeasonCache(season: AnilistSeasonName, seasonYear: number): Promise<SeasonCacheFile | null> {
	const path = seasonCachePath(season, seasonYear);
	const remembered = memory.get(path);
	if (remembered) {
		return remembered;
	}
	try {
		const parsed = parseSeasonCache(JSON.parse(decryptWithSafeStorage(await readFile(path))) as unknown);
		if (parsed) {
			memory.set(path, parsed);
		}
		return parsed;
	} catch {
		// missing, tampered or unreadable: treat as a miss and refetch
		return null;
	}
}

export async function writeSeasonCache(options: { season: AnilistSeasonName; seasonYear: number; items: SeasonItemCached[] }): Promise<SeasonCacheFile> {
	const payload: SeasonCacheFile = {
		season: options.season,
		seasonYear: options.seasonYear,
		fetchedAt: new Date().toISOString(),
		items: options.items,
	};
	const path = seasonCachePath(options.season, options.seasonYear);
	await writeFile(path, encryptSeasonCache(payload));
	memory.set(path, payload);
	return payload;
}
