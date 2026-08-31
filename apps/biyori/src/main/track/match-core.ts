import type { TitleParts } from "@biyori/recognition";
import { matchParsed as matchParsedFilename, normalizeTitle, matchTitle as scoreTitle } from "@biyori/recognition";
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

export function namesFrom(title: string, alternativeTitles: string): string[] {
	return [title, ...alternativeTitles.split(/[,;]/)].map((item) => normalizeTitle(item)).filter(Boolean);
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
	const hit = scoreTitle(query, candidates);
	return hit ? toMatch(hit) : null;
}

export function matchParsed(parsed: TitleParts, candidates: Candidate[]): MatchedAnime | null {
	const hit = matchParsedFilename(parsed, candidates);
	return hit ? toMatch(hit) : null;
}

export function matchById(id: number, candidates: Candidate[]): MatchedAnime | null {
	const hit = candidates.find((item) => item.id === id);
	return hit ? toMatch(hit) : null;
}
