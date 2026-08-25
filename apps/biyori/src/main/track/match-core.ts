import type { MatchedAnime } from "./types";

export type Candidate = {
	id: number;
	title: string;
	alternativeTitles: string;
	type: string;
	coverUrl: string;
	bannerUrl: string;
	episodes: number;
	episodesWatched: number;
	status: string;
	rewatching: boolean;
	folder: string;
	fansub: string;
	lastAiredEpisode: number;
	airingStatus: string;
	season: string;
	averageScore: number;
	synopsis: string;
	genres: string[];
	producers: string[];
	score: number | null;
	notes: string;
	timesRewatched: number;
	dateStarted: string | null;
	dateCompleted: string | null;
	names: string[];
};

function normalize(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
}

function bigrams(value: string): string[] {
	const grams: string[] = [];
	for (let i = 0; i < value.length - 1; i += 1) {
		grams.push(value.slice(i, i + 2));
	}
	return grams;
}

function dice(left: string, right: string): number {
	if (!left || !right) {
		return 0;
	}
	if (left === right) {
		return 1;
	}
	const a = bigrams(left);
	const b = new Set(bigrams(right));
	if (a.length === 0 || b.size === 0) {
		return 0;
	}
	let hits = 0;
	for (const gram of a) {
		if (b.has(gram)) {
			hits += 1;
		}
	}
	return (2 * hits) / (a.length + b.size);
}

export function namesFrom(title: string, alternativeTitles: string): string[] {
	return [title, ...alternativeTitles.split(/[,;]/)].map((item) => normalize(item)).filter(Boolean);
}

function statusBoost(status: string): number {
	if (status === "Currently watching") {
		return 0.12;
	}
	if (status === "Plan to watch") {
		return 0.04;
	}
	return 0;
}

function toMatch(candidate: Candidate): MatchedAnime {
	return {
		id: candidate.id,
		title: candidate.title,
		alternativeTitles: candidate.alternativeTitles,
		type: candidate.type,
		coverUrl: candidate.coverUrl,
		bannerUrl: candidate.bannerUrl,
		episodes: candidate.episodes,
		episodesWatched: candidate.episodesWatched,
		status: candidate.status,
		rewatching: candidate.rewatching,
		folder: candidate.folder,
		fansub: candidate.fansub,
		lastAiredEpisode: candidate.lastAiredEpisode,
		airingStatus: candidate.airingStatus,
		season: candidate.season,
		averageScore: candidate.averageScore,
		synopsis: candidate.synopsis,
		genres: candidate.genres,
		producers: candidate.producers,
		score: candidate.score,
		notes: candidate.notes,
		timesRewatched: candidate.timesRewatched,
		dateStarted: candidate.dateStarted,
		dateCompleted: candidate.dateCompleted,
	};
}

export function matchTitle(query: string, candidates: Candidate[]): MatchedAnime | null {
	const needle = normalize(query);
	if (!needle) {
		return null;
	}
	let best: { candidate: Candidate; score: number } | null = null;
	for (const candidate of candidates) {
		let nameScore = 0;
		for (const name of candidate.names) {
			const exact = name === needle ? 1 : 0;
			const contains = name.includes(needle) || needle.includes(name) ? 0.82 : 0;
			nameScore = Math.max(nameScore, exact, contains, dice(name, needle));
		}
		const score = nameScore + statusBoost(candidate.status);
		if (!best || score > best.score) {
			best = { candidate, score };
		}
	}
	if (!best || best.score < 0.62) {
		return null;
	}
	return toMatch(best.candidate);
}

export function matchById(id: number, candidates: Candidate[]): MatchedAnime | null {
	const hit = candidates.find((item) => item.id === id);
	return hit ? toMatch(hit) : null;
}
