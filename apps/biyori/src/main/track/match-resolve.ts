import type { TitleParts } from "@biyori/recognition";
import type { Candidate } from "./match-core";
import { matchById, matchParsed, relationHopCandidates } from "./match-core";
import { redirectEpisode, uniqueRedirect } from "./relations";
import type { MatchedAnime } from "./types";

export function resolveFileMatch(
	parts: TitleParts,
	episode: number | null,
	candidates: Candidate[],
): { match: MatchedAnime | null; episode: number | null } {
	const match = matchParsed(parts, candidates);
	if (episode == null) {
		return { match, episode };
	}
	const hopped = parts.season != null && parts.season > 1 ? uniqueRedirect(episode, relationHopCandidates(parts, candidates)) : null;
	if (hopped && hopped.id !== match?.id) {
		return { match: matchById(hopped.id, candidates), episode: hopped.episode };
	}
	if (!match) {
		return { match: null, episode };
	}
	const redirected = redirectEpisode(match, episode);
	if (redirected.id === match.id) {
		return { match, episode: redirected.episode };
	}
	return { match: matchById(redirected.id, candidates) ?? match, episode: redirected.episode };
}
