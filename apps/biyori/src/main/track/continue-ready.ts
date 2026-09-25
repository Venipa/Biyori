type EpisodeHit = {
	animeId: number;
	episode: number;
};

export function continueReadyEpisodes(hits: readonly EpisodeHit[], onDisk: ReadonlyMap<number, ReadonlySet<number>>, nextByAnime: ReadonlyMap<number, number>): EpisodeHit[] {
	const announced = new Set<number>();
	const ready: EpisodeHit[] = [];
	for (const hit of hits) {
		if (hit.animeId <= 0 || hit.episode <= 0 || announced.has(hit.animeId)) {
			continue;
		}
		if (nextByAnime.get(hit.animeId) !== hit.episode) {
			continue;
		}
		if (onDisk.get(hit.animeId)?.has(hit.episode)) {
			continue;
		}
		announced.add(hit.animeId);
		ready.push({ animeId: hit.animeId, episode: hit.episode });
	}
	return ready;
}
