import type { RelationRule } from "./types";

export function applyRelationRule(id: number, episode: number, rules: RelationRule[]): { id: number; episode: number } {
	for (const rule of rules) {
		if (rule.fromId !== id) {
			continue;
		}
		if (episode < rule.fromStart) {
			continue;
		}
		if (rule.fromEnd != null && episode > rule.fromEnd) {
			continue;
		}
		return {
			id: rule.toId,
			episode: episode - rule.fromStart + rule.toStart,
		};
	}
	return { id, episode };
}

export function redirectIfOutOfRange(match: { id: number; episodes: number }, episode: number, rules: RelationRule[]): { id: number; episode: number } {
	if (match.episodes <= 0 || episode <= match.episodes) {
		return { id: match.id, episode };
	}
	return applyRelationRule(match.id, episode, rules);
}

export function uniqueOutOfRangeRedirect(
	episode: number,
	candidates: Array<{ id: number; episodes: number }>,
	rules: RelationRule[],
): { id: number; episode: number } | null {
	const dest = new Map<number, number>();
	for (const candidate of candidates) {
		const redirected = redirectIfOutOfRange(candidate, episode, rules);
		if (redirected.id === candidate.id && redirected.episode === episode) {
			continue;
		}
		const prev = dest.get(redirected.id);
		if (prev != null && prev !== redirected.episode) {
			return null;
		}
		dest.set(redirected.id, redirected.episode);
	}
	if (dest.size !== 1) {
		return null;
	}
	const [id, destEpisode] = [...dest][0]!;
	return { id, episode: destEpisode };
}
