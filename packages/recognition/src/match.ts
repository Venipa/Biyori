import { extendTitle } from "./extend-title";
import type { TitleCandidate, TitleParts } from "./types";

const MATCH_FLOOR = 0.72;
const UNIQUE_MARGIN = 0.08;

const SPACE_PUNCT = /[^\p{L}\p{N}]+/gu;
const STRIP_PUNCT = /[^\p{L}\p{N}]+/gu;
const ORDINAL_WORD = /\b(first|second|third|fourth|fifth|sixth)\b/g;
const ORDINAL_TO: Record<string, string> = {
	first: "1st",
	second: "2nd",
	third: "3rd",
	fourth: "4th",
	fifth: "5th",
	sixth: "6th",
};
const SEASON_PHRASE = /\b(?:(\d+)(?:st|nd|rd|th) season|season (\d+)|series (\d+)|s(\d+))\b/g;
const STRIP_SEASON = /\b(?:\d+(?:st|nd|rd|th)\s+season|season\s+\d+|series\s+\d+|s\d+)\b/g;
const SEASON_IN_NAME = /\b(?:(\d+)(?:st|nd|rd|th)\s+season|(?:season|series)\s+(\d+)|s(\d{1,2}))\b/;
const EXTRA_SEASON = /^(season \d+|\d+th season|\d{4}|s\d+)$/;

const lookupCache = new Map<string, string>();

export function normalizeTitle(value: string): string {
	return value.toLowerCase().replace(SPACE_PUNCT, " ").trim();
}

export function normalizeForLookup(value: string): string {
	const cached = lookupCache.get(value);
	if (cached !== undefined) {
		return cached;
	}
	const key = normalizeTitle(value)
		.replace(ORDINAL_WORD, (word) => ORDINAL_TO[word] ?? word)
		.replace(SEASON_PHRASE, (_all, nth, season, series, short) => nth ?? season ?? series ?? short)
		.replace(STRIP_PUNCT, "");
	lookupCache.set(value, key);
	return key;
}

function stripSeason(value: string): string {
	return value.replace(STRIP_SEASON, "").replace(/\s+/g, " ").trim();
}

function seasonFromNames(names: string[]): number | null {
	for (const name of names) {
		const match = name.match(SEASON_IN_NAME);
		if (match) {
			return Number(match[1] ?? match[2] ?? match[3]);
		}
	}
	return null;
}

function dice(left: string, right: string): number {
	if (!left || !right) {
		return 0;
	}
	if (left === right) {
		return 1;
	}
	if (left.length < 2 || right.length < 2) {
		return 0;
	}
	const grams = new Set<string>();
	for (let i = 0; i < right.length - 1; i += 1) {
		grams.add(right.slice(i, i + 2));
	}
	let hits = 0;
	for (let i = 0; i < left.length - 1; i += 1) {
		if (grams.has(left.slice(i, i + 2))) {
			hits += 1;
		}
	}
	return (2 * hits) / (left.length - 1 + grams.size);
}

function lengthRatio(left: string, right: string): number {
	const max = Math.max(left.length, right.length);
	return max === 0 ? 0 : Math.min(left.length, right.length) / max;
}

function nameScore(name: string, needle: string, needleKey: string): number {
	if (name === needle || normalizeForLookup(name) === needleKey) {
		return 1;
	}
	const baseName = stripSeason(name);
	const baseNeedle = stripSeason(needle);
	if (baseName && baseNeedle && normalizeForLookup(baseName) === normalizeForLookup(baseNeedle)) {
		return 0.92;
	}
	if (name.includes(needle)) {
		return lengthRatio(name, needle);
	}
	if (needle.includes(name)) {
		const extra = needle.slice(needle.indexOf(name) + name.length).trim();
		return EXTRA_SEASON.test(extra) ? 0.35 : lengthRatio(name, needle) * 0.9;
	}
	return dice(baseName || name, baseNeedle || needle);
}

function scoreCandidate<T extends TitleCandidate>(candidate: T, needle: string, needleKey: string, season?: number | null): number {
	let score = 0;
	for (const name of candidate.names) {
		score = Math.max(score, nameScore(name, needle, needleKey));
	}
	if (season == null || season <= 1) {
		return score;
	}
	const listed = seasonFromNames(candidate.names);
	if (listed === season) {
		return score + 0.12;
	}
	if (listed != null) {
		return score - 0.35;
	}
	return score >= 0.7 ? score - 0.2 : score;
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
	const lookupKey = normalizeForLookup(query);
	const exact: T[] = [];
	for (const candidate of candidates) {
		if (candidate.names.some((name) => normalizeForLookup(name) === lookupKey)) {
			exact.push(candidate);
		}
	}
	if (exact.length === 1) {
		return exact[0];
	}
	const pool = exact.length > 1 ? exact : candidates;
	let best: { candidate: T; score: number } | null = null;
	let second = 0;
	for (const candidate of pool) {
		const score = scoreCandidate(candidate, needle, lookupKey, season);
		if (!best || score > best.score) {
			second = best?.score ?? 0;
			best = { candidate, score };
		} else if (score > second) {
			second = score;
		}
	}
	if (!best || best.score < MATCH_FLOOR) {
		return null;
	}
	if (best.score < 1 && best.score - second < UNIQUE_MARGIN) {
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
