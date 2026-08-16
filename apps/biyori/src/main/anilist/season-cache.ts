import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
	SeasonCacheFile,
	SeasonItemCached,
} from "../../lib/schemas/seasons";
import {
	seasonCacheFileSchema,
	type AnilistSeasonName,
} from "../../lib/schemas/seasons";
import { appCacheDir } from "../lib/app-paths";

function seasonsDir(): string {
	const dir = join(appCacheDir(), "seasons");
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function seasonCachePath(
	season: AnilistSeasonName,
	seasonYear: number,
): string {
	return join(seasonsDir(), `${season}-${seasonYear}.json`);
}

export function readSeasonCache(
	season: AnilistSeasonName,
	seasonYear: number,
): SeasonCacheFile | null {
	const path = seasonCachePath(season, seasonYear);
	if (!existsSync(path)) {
		return null;
	}
	try {
		const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
		if (
			raw &&
			typeof raw === "object" &&
			"items" in raw &&
			Array.isArray(raw.items) &&
			raw.items.some(
				(item) =>
					item != null &&
					typeof item === "object" &&
					!("isAdult" in item),
			)
		) {
			return null;
		}
		const parsed = seasonCacheFileSchema.safeParse(raw);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function writeSeasonCache(options: {
	season: AnilistSeasonName;
	seasonYear: number;
	items: SeasonItemCached[];
}): SeasonCacheFile {
	const payload: SeasonCacheFile = {
		season: options.season,
		seasonYear: options.seasonYear,
		fetchedAt: new Date().toISOString(),
		items: options.items,
	};
	writeFileSync(
		seasonCachePath(options.season, options.seasonYear),
		JSON.stringify(payload),
		"utf8",
	);
	return payload;
}
