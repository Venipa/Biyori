import type { AnilistSeasonName, SeasonCacheFile } from "./schemas/seasons";

const ACTIVE_SEASON_TTL_MS = 12 * 60 * 60 * 1000;
const SEASON_LAST_MONTH: Record<AnilistSeasonName, number> = { WINTER: 2, SPRING: 5, SUMMER: 8, FALL: 11 };

/** Past seasons (ended 3+ months ago, so late finales are in) never expire; current/upcoming refresh every 12h. */
export function isSeasonCacheFresh(cache: Pick<SeasonCacheFile, "season" | "seasonYear" | "fetchedAt">, now = Date.now()): boolean {
	const settledAt = new Date(cache.seasonYear, SEASON_LAST_MONTH[cache.season] + 4, 1).getTime();
	if (now >= settledAt) {
		return true;
	}
	const fetchedAt = Date.parse(cache.fetchedAt);
	return Number.isFinite(fetchedAt) && now - fetchedAt < ACTIVE_SEASON_TTL_MS;
}
