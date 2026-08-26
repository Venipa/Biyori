import type { RelationRule } from "./types";

export function applyRelationRule(
	id: number,
	episode: number,
	rules: RelationRule[],
): { id: number; episode: number } {
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

export function redirectIfOutOfRange(
	match: { id: number; episodes: number },
	episode: number,
	rules: RelationRule[],
): { id: number; episode: number } {
	if (match.episodes <= 0 || episode <= match.episodes) {
		return { id: match.id, episode };
	}
	return applyRelationRule(match.id, episode, rules);
}
