export type StatisticsEntry = {
	status: string;
	episodes: number;
	lastAiredEpisode: number;
	episodesWatched: number;
	timesRewatched: number;
	durationMinutes: number;
	type: string;
	score: number | null;
};

export type StatisticsSummary = {
	animeCount: number;
	episodeCount: number;
	spentMinutes: number;
	remainingMinutes: number;
	meanScore: number;
	scoreDeviation: number;
	scoreDistribution: Array<{
		score: number;
		count: number;
		ratio: number;
	}>;
};

function estimateDuration(entry: StatisticsEntry): number {
	if (entry.durationMinutes > 0) {
		return entry.durationMinutes;
	}
	switch (entry.type) {
		case "Movie":
			return 90;
		case "Special":
			return 12;
		case "Music":
			return 5;
		default:
			return 24;
	}
}

function estimateEpisodeCount(entry: StatisticsEntry): number {
	if (entry.episodes > 0) {
		return entry.episodes;
	}
	const known = Math.max(entry.lastAiredEpisode, entry.episodesWatched);
	if (known < 12) {
		return 12;
	}
	if (known < 24) {
		return 26;
	}
	if (known < 50) {
		return 52;
	}
	return 0;
}

export function summarizeList(entries: StatisticsEntry[]): StatisticsSummary {
	let episodeCount = 0;
	let spentMinutes = 0;
	let remainingMinutes = 0;
	const scores: number[] = [];
	const scoreCounts = Array.from({ length: 11 }, () => 0);

	for (const entry of entries) {
		const watched = entry.episodesWatched + entry.timesRewatched * entry.episodes;
		const duration = estimateDuration(entry);
		episodeCount += watched;
		spentMinutes += duration * watched;
		if (entry.status !== "Completed" && entry.status !== "Dropped") {
			const remaining = Math.max(0, estimateEpisodeCount(entry) - entry.episodesWatched);
			remainingMinutes += duration * remaining;
		}
		if (entry.score != null && entry.score > 0) {
			scores.push(entry.score);
			const index = Math.min(10, Math.floor(entry.score / 10));
			scoreCounts[index] += 1;
		}
	}

	const mean = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
	const deviation = scores.length > 0 ? Math.sqrt(scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length) : 0;
	const largestBucket = Math.max(1, ...scoreCounts);

	return {
		animeCount: entries.length,
		episodeCount,
		spentMinutes,
		remainingMinutes,
		meanScore: Number((mean / 10).toFixed(2)),
		scoreDeviation: Number((deviation / 10).toFixed(2)),
		scoreDistribution: Array.from({ length: 10 }, (_, index) => {
			const score = 10 - index;
			const value = scoreCounts[score];
			return {
				score,
				count: value,
				ratio: value / largestBucket,
			};
		}),
	};
}
