export type StatisticsEntry = {
	title: string;
	status: string;
	episodes: number;
	lastAiredEpisode: number;
	episodesWatched: number;
	timesRewatched: number;
	durationMinutes: number;
	type: string;
	score: number | null;
	airingStatus: string;
	genres: string[];
	libraryEpisodeCount: number;
};

export type StatBucket = {
	label: string;
	count: number;
	ratio: number;
	total?: number;
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
	statusDistribution: StatBucket[];
	typeDistribution: StatBucket[];
	genreDistribution: StatBucket[];
	rewatchDistribution: StatBucket[];
	libraryCoverage: {
		have: number;
		aired: number;
		ratio: number;
		byStatus: StatBucket[];
	};
};

const STATUS_ORDER = ["Currently watching", "Completed", "On hold", "Dropped", "Plan to watch"] as const;
const GENRE_LIMIT = 15;
const REWATCH_LIMIT = 15;

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

function airedEpisodeCount(entry: StatisticsEntry): number {
	const finished = entry.airingStatus === "Finished airing" || entry.airingStatus === "Cancelled";
	if (finished && entry.episodes > 0) {
		return entry.episodes;
	}
	return Math.max(entry.lastAiredEpisode, entry.episodesWatched, 0);
}

function bucketsFromCounts(counts: Map<string, number>, order?: readonly string[]): StatBucket[] {
	if (counts.size === 0) {
		return [];
	}
	const largest = Math.max(1, ...counts.values());
	const labels: string[] = [];
	if (order) {
		for (const label of order) {
			if (counts.has(label)) {
				labels.push(label);
			}
		}
	}
	const rest = [...counts.keys()].filter((label) => !labels.includes(label)).toSorted((left, right) => left.localeCompare(right));
	for (const label of rest) {
		labels.push(label);
	}
	return labels.map((label) => {
		const count = counts.get(label) ?? 0;
		return { label, count, ratio: count / largest };
	});
}

export function summarizeList(entries: StatisticsEntry[]): StatisticsSummary {
	let episodeCount = 0;
	let spentMinutes = 0;
	let remainingMinutes = 0;
	const scores: number[] = [];
	const scoreCounts = Array.from({ length: 11 }, () => 0);
	const statusCounts = new Map<string, number>();
	const typeCounts = new Map<string, number>();
	const genreCounts = new Map<string, number>();
	const rewatches: Array<{ label: string; count: number }> = [];
	let libraryHave = 0;
	let libraryAired = 0;
	const coverageHave = new Map<string, number>();
	const coverageAired = new Map<string, number>();

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
		statusCounts.set(entry.status, (statusCounts.get(entry.status) ?? 0) + 1);
		const typeLabel = entry.type.trim() || "Unknown";
		typeCounts.set(typeLabel, (typeCounts.get(typeLabel) ?? 0) + 1);
		for (const genre of entry.genres) {
			const name = genre.trim();
			if (!name) {
				continue;
			}
			genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1);
		}
		if (entry.timesRewatched > 0) {
			rewatches.push({ label: entry.title, count: entry.timesRewatched });
		}
		const aired = airedEpisodeCount(entry);
		libraryHave += entry.libraryEpisodeCount;
		libraryAired += aired;
		coverageHave.set(entry.status, (coverageHave.get(entry.status) ?? 0) + entry.libraryEpisodeCount);
		coverageAired.set(entry.status, (coverageAired.get(entry.status) ?? 0) + aired);
	}

	const mean = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
	const deviation = scores.length > 0 ? Math.sqrt(scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length) : 0;
	const largestBucket = Math.max(1, ...scoreCounts);
	const genreBars = bucketsFromCounts(genreCounts)
		.toSorted((left, right) => right.count - left.count || left.label.localeCompare(right.label))
		.slice(0, GENRE_LIMIT);
	const largestGenre = Math.max(1, ...genreBars.map((item) => item.count));
	const rewatchBars = rewatches
		.toSorted((left, right) => right.count - left.count || left.label.localeCompare(right.label))
		.slice(0, REWATCH_LIMIT);
	const largestRewatch = Math.max(1, ...rewatchBars.map((item) => item.count));
	const coverageBars: StatBucket[] = STATUS_ORDER.filter((status) => coverageAired.has(status) || coverageHave.has(status)).map((status) => {
		const have = coverageHave.get(status) ?? 0;
		const aired = coverageAired.get(status) ?? 0;
		return {
			label: status,
			count: have,
			total: aired,
			ratio: aired > 0 ? Math.min(1, have / aired) : have > 0 ? 1 : 0,
		};
	});

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
		statusDistribution: bucketsFromCounts(statusCounts, STATUS_ORDER),
		typeDistribution: bucketsFromCounts(typeCounts),
		genreDistribution: genreBars.map((item) => ({ ...item, ratio: item.count / largestGenre })),
		rewatchDistribution: rewatchBars.map((item) => ({
			label: item.label,
			count: item.count,
			ratio: item.count / largestRewatch,
		})),
		libraryCoverage: {
			have: libraryHave,
			aired: libraryAired,
			ratio: libraryAired > 0 ? Math.min(1, libraryHave / libraryAired) : libraryHave > 0 ? 1 : 0,
			byStatus: coverageBars,
		},
	};
}
