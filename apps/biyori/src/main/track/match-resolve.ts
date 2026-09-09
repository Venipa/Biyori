import { rankParsed, seasonFromNames, type TitleParts } from "@biyori/recognition";
import type { Candidate } from "./match-core";
import { matchById, matchParsed, relationHopCandidates } from "./match-core";
import { redirectEpisode, uniqueRedirect } from "./relations";
import type { MatchedAnime } from "./types";

function seasonCompatible(fileSeason: number | null, names: string[]): boolean {
	const file = fileSeason != null && fileSeason > 0 ? fileSeason : null;
	const listed = seasonFromNames(names);
	if (file != null && listed != null) {
		return file === listed;
	}
	if (file != null) {
		return file <= 1;
	}
	if (listed != null) {
		return listed <= 1;
	}
	return true;
}

function pickSeasonCompatible(parts: TitleParts, candidates: Candidate[]): Candidate | null {
	if (parts.season == null || parts.season <= 1) {
		return null;
	}
	const fits = candidates.filter((candidate) => seasonCompatible(parts.season, candidate.names));
	if (fits.length === 0) {
		return null;
	}
	if (fits.length === 1) {
		return fits[0];
	}
	return rankParsed(parts, fits)[0]?.candidate ?? null;
}

function withRedirect(match: { id: number; episodes: number }, episode: number, candidates: Candidate[]) {
	const redirected = redirectEpisode(match, episode);
	if (redirected.id === match.id) {
		return { match: matchById(match.id, candidates), episode: redirected.episode };
	}
	return { match: matchById(redirected.id, candidates) ?? matchById(match.id, candidates), episode: redirected.episode };
}

export function resolveFileMatch(parts: TitleParts, episode: number | null, candidates: Candidate[]): { match: MatchedAnime | null; episode: number | null } {
	const match = matchParsed(parts, candidates);
	if (episode == null) {
		return { match, episode };
	}
	const listed = match ? candidates.find((candidate) => candidate.id === match.id) : undefined;
	if (match != null && listed != null && seasonCompatible(parts.season, listed.names)) {
		return withRedirect(listed, episode, candidates);
	}
	const seasonHit = pickSeasonCompatible(parts, candidates);
	if (seasonHit) {
		return withRedirect(seasonHit, episode, candidates);
	}
	const hopped = parts.season != null && parts.season > 1 ? uniqueRedirect(episode, relationHopCandidates(parts, candidates)) : null;
	if (hopped) {
		return { match: matchById(hopped.id, candidates), episode: hopped.episode };
	}
	if (!match) {
		return { match: null, episode };
	}
	return withRedirect(listed ?? { id: match.id, episodes: match.episodes }, episode, candidates);
}
