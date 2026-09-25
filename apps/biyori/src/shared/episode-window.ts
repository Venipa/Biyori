export const EPISODE_SCAN_STATUSES = ["Currently watching", "Completed", "Plan to watch"] as const;

export const EPISODE_AIR_GAP_MS = 7 * 24 * 60 * 60 * 1000;

export function nextListEpisode(episodesWatched: number): number {
	return episodesWatched + 1;
}

export function episodeInAirWindow(row: { episodesWatched: number; lastAiredEpisode: number; nextAiringAt?: string | null }, now: number): boolean {
	const next = nextListEpisode(row.episodesWatched);
	if (row.lastAiredEpisode >= next) {
		return true;
	}
	if (!row.nextAiringAt) {
		return false;
	}
	const at = Date.parse(row.nextAiringAt);
	return !Number.isNaN(at) && at <= now + EPISODE_AIR_GAP_MS;
}

export function isMissingAiredEpisode(
	row: { episodesWatched: number; lastAiredEpisode: number; nextAiringAt?: string | null; indexedEpisodes: readonly number[] },
	now: number,
): boolean {
	const next = nextListEpisode(row.episodesWatched);
	if (row.indexedEpisodes.includes(next)) {
		return false;
	}
	return episodeInAirWindow(row, now);
}
