import { extendTitle } from "./extend-title";
import type { TitleCandidate, TitleParts } from "./types";

const MATCH_FLOOR = 0.62;

export function normalizeTitle(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
}

function dice(left: string, right: string): number {
	if (!left || !right) {
		return 0;
	}
	if (left === right) {
		return 1;
	}
	const a: string[] = [];
	for (let i = 0; i < left.length - 1; i += 1) {
		a.push(left.slice(i, i + 2));
	}
	const b = new Set<string>();
	for (let i = 0; i < right.length - 1; i += 1) {
		b.add(right.slice(i, i + 2));
	}
	if (a.length === 0 || b.size === 0) {
		return 0;
	}
	return (2 * a.filter((gram) => b.has(gram)).length) / (a.length + b.size);
}

function statusBoost(status: string | undefined): number {
	if (status === "Currently watching") {
		return 0.12;
	}
	if (status === "Plan to watch") {
		return 0.04;
	}
	return 0;
}

function seasonHint(names: string[], season: number): number {
	const token = String(season);
	return names.some(
		(name) =>
			name.includes(`season ${token}`) ||
			name.includes(`${token}th`) ||
			name.includes(` s${token}`) ||
			name.endsWith(` ${token}`),
	)
		? 0.2
		: 0;
}

function nameScore(name: string, needle: string): number {
	if (name === needle) {
		return 1;
	}
	if (name.includes(needle)) {
		return 0.9;
	}
	if (needle.includes(name)) {
		const extra = needle.slice(needle.indexOf(name) + name.length).trim();
		if (/^(season \d+|\d+th season|\d{4}|s\d+)$/.test(extra)) {
			return 0.35;
		}
		return 0.82;
	}
	return dice(name, needle);
}

export function matchTitle<T extends TitleCandidate>(
	query: string,
	candidates: T[],
	season?: number | null,
): T | null {
	const needle = normalizeTitle(query);
	if (!needle) {
		return null;
	}
	let best: { candidate: T; score: number } | null = null;
	for (const candidate of candidates) {
		let score = 0;
		for (const name of candidate.names) {
			score = Math.max(score, nameScore(name, needle));
		}
		score += statusBoost(candidate.status);
		if (season != null && season > 1) {
			score += seasonHint(candidate.names, season);
		}
		if (!best || score > best.score) {
			best = { candidate, score };
		}
	}
	if (!best || best.score < MATCH_FLOOR) {
		return null;
	}
	return best.candidate;
}

export function matchParsed<T extends TitleCandidate>(
	parsed: TitleParts,
	candidates: T[],
): T | null {
	return matchTitle(extendTitle(parsed), candidates, parsed.season);
}
