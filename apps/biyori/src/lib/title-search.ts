const MARKS = /\p{M}+/gu;
const NON_WORD = /[^\p{L}\p{N}]+/gu;
const FUZZY_FLOOR = 0.5;
const SEARCH_LIMIT = 10;

/** Lowercase, strip accents, punctuation to single spaces: "Pokémon: Re-Zero!" -> "pokemon re zero". */
export function foldText(value: string): string {
	return value.normalize("NFKD").replace(MARKS, "").toLowerCase().replace(NON_WORD, " ").trim();
}

/** Folded and space-free, so "rezero" meets "Re:Zero". */
export function compactText(value: string): string {
	return foldText(value).replaceAll(" ", "");
}

export function textIncludes(haystack: string, needle: string): boolean {
	const folded = foldText(needle);
	return foldText(haystack).includes(folded) || compactText(haystack).includes(folded.replaceAll(" ", ""));
}

function dice(left: string, right: string): number {
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

// tiers: exact > prefix > word prefix > any-order words > substring > typo; bonus favours shorter titles
function nameScore(name: string, query: string, queryCompact: string, tokens: string[]): number {
	const folded = foldText(name);
	const compact = folded.replaceAll(" ", "");
	const bonus = (0.04 * queryCompact.length) / Math.max(compact.length, 1);
	if (folded === query || compact === queryCompact) {
		return 1;
	}
	if (folded.startsWith(query) || compact.startsWith(queryCompact)) {
		return 0.9 + bonus;
	}
	if (folded.includes(` ${query}`)) {
		return 0.8 + bonus;
	}
	const words = folded.split(" ");
	if (tokens.every((token) => words.some((word) => word.startsWith(token)))) {
		return 0.7 + bonus;
	}
	if (compact.includes(queryCompact)) {
		return 0.6 + bonus;
	}
	const fuzzy = tokens.reduce((sum, token) => sum + Math.max(...words.map((word) => dice(token, word))), 0) / tokens.length;
	return fuzzy >= FUZZY_FLOOR ? fuzzy * 0.5 : 0;
}

/** For typed queries; filenames go through rankTitles. */
export function searchTitles<T extends { names: string[] }>(rawQuery: string, candidates: T[], limit = SEARCH_LIMIT): { candidate: T; score: number }[] {
	const query = foldText(rawQuery);
	if (!query) {
		return [];
	}
	const queryCompact = query.replaceAll(" ", "");
	const tokens = query.split(" ");
	const ranked: { candidate: T; score: number }[] = [];
	for (const candidate of candidates) {
		const score = Math.max(0, ...candidate.names.map((name) => nameScore(name, query, queryCompact, tokens)));
		if (score > 0) {
			ranked.push({ candidate, score });
		}
	}
	ranked.sort((left, right) => right.score - left.score);
	return ranked.slice(0, limit);
}
