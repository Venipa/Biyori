export const ANIME_STALE_MS = 60 * 60 * 1000;

export function isAnimeStale(staleAt: string | null | undefined, now = Date.now()): boolean {
	if (!staleAt) {
		return true;
	}
	const at = Date.parse(staleAt);
	return !Number.isFinite(at) || now - at >= ANIME_STALE_MS;
}
