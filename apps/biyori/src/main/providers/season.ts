import type { TitleLanguage } from "../../lib/schemas/app-settings";
import type { AnilistSeasonName, SeasonItem } from "../../lib/schemas/seasons";
import { isSeasonCacheFresh } from "../../lib/season-cache-fresh";
import { withMediaCardTitle } from "../anilist/map";
import { readSeasonCache, writeSeasonCache } from "./season-cache";
import type { ListProvider } from "./types";

/** Season grid for the active provider, served from the on-disk cache while fresh. */
export async function loadSeason(
	provider: ListProvider,
	options: { season: AnilistSeasonName; seasonYear: number; titleLanguage: TitleLanguage; forceRefresh?: boolean; signal?: AbortSignal },
): Promise<{ items: SeasonItem[]; fromCache: boolean; fetchedAt: string | null }> {
	const resolve = (items: Parameters<typeof withMediaCardTitle>[0][]) => items.map((item) => withMediaCardTitle(item, options.titleLanguage));
	if (!options.forceRefresh) {
		const cached = await readSeasonCache(options.season, options.seasonYear);
		if (cached && isSeasonCacheFresh(cached)) {
			return { items: resolve(cached.items), fromCache: true, fetchedAt: cached.fetchedAt };
		}
	}
	const items = await provider.seasonItems(options.season, options.seasonYear, options.signal);
	const written = await writeSeasonCache({ season: options.season, seasonYear: options.seasonYear, items });
	return { items: resolve(written.items), fromCache: false, fetchedAt: written.fetchedAt };
}
