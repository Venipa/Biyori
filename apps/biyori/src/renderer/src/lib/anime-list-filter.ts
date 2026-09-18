import { type StoredAnimeTitles, titleStrings } from "../../../lib/anime-titles";
import { parseJsonArray } from "../../../lib/parse-json-array";
import { splitTitleList } from "../../../lib/split-title-list";

export type ListFilterRow = {
	title: string;
	titles?: StoredAnimeTitles;
	userSynonyms?: string;
	genres?: string;
	tags?: string;
	notes?: string;
	type?: string;
	season?: string;
	id?: number | null;
	episodes?: number;
	score?: number | null;
	popularRank?: number | null;
};

export type SearchField = "none" | "id" | "eps" | "title" | "genre" | "tags" | "note" | "type" | "season" | "year" | "score" | "popular";

export type SearchOperator = "eq" | "ge" | "gt" | "le" | "lt";

export type SearchTerm = {
	field: SearchField;
	op: SearchOperator;
	value: string;
};

export type FilterClause = {
	field: Exclude<SearchField, "none">;
	op: SearchOperator;
	value: string;
};

export type ParsedFilterQuery = {
	freeText: string;
	clauses: FilterClause[];
};

function parseOperator(raw: string | undefined): SearchOperator {
	switch (raw) {
		case ">=":
			return "ge";
		case ">":
			return "gt";
		case "<=":
			return "le";
		case "<":
			return "lt";
		default:
			return "eq";
	}
}

export function formatSearchOperator(op: SearchOperator): string {
	switch (op) {
		case "ge":
			return ">=";
		case "gt":
			return ">";
		case "le":
			return "<=";
		case "lt":
			return "<";
		default:
			return "";
	}
}

function fieldFromPrefix(prefix: string): SearchField | null {
	switch (prefix) {
		case "id":
			return "id";
		case "eps":
			return "eps";
		case "title":
			return "title";
		case "genre":
		case "genres":
			return "genre";
		case "tag":
		case "tags":
			return "tags";
		case "note":
			return "note";
		case "type":
			return "type";
		case "season":
			return "season";
		case "year":
			return "year";
		case "score":
			return "score";
		case "popular":
		case "popularity":
			return "popular";
		default:
			return null;
	}
}

export function parseTerm(raw: string): SearchTerm {
	const match = /^([a-z]+):([!<>=]+)?(.+)$/i.exec(raw);
	if (!match) {
		return { field: "none", op: "eq", value: raw };
	}
	const field = fieldFromPrefix(match[1].toLowerCase());
	if (!field) {
		return { field: "none", op: "eq", value: raw };
	}
	return { field, op: parseOperator(match[2]), value: match[3] };
}

export function parseFilterQuery(raw: string | null | undefined): ParsedFilterQuery {
	const words = (raw ?? "").trim().split(/\s+/).filter(Boolean);
	const free: string[] = [];
	const clauses: FilterClause[] = [];
	for (const word of words) {
		const term = parseTerm(word);
		if (term.field === "none") {
			free.push(term.value);
			continue;
		}
		if (clauses.some((clause) => clause.field === term.field)) {
			continue;
		}
		clauses.push({ field: term.field, op: term.op, value: term.value });
	}
	return { freeText: free.join(" "), clauses };
}

export function appendFilterClauses(current: FilterClause[], extra: FilterClause[]): FilterClause[] {
	const used = new Set(current.map((clause) => clause.field));
	const next = [...current];
	for (const clause of extra) {
		if (used.has(clause.field)) {
			continue;
		}
		used.add(clause.field);
		next.push(clause);
	}
	return next;
}

export function serializeFilterQuery(query: ParsedFilterQuery): string {
	const tokens = query.clauses.filter((clause) => clause.value.trim().length > 0).map((clause) => `${clause.field}:${formatSearchOperator(clause.op)}${clause.value.trim()}`);
	const free = query.freeText.trim();
	if (free) {
		tokens.push(free);
	}
	return tokens.join(" ");
}

function parseBool(value: string): boolean | null {
	switch (value.trim().toLowerCase()) {
		case "true":
		case "yes":
		case "1":
			return true;
		case "false":
		case "no":
		case "0":
			return false;
		default:
			return null;
	}
}

function checkNumber(op: SearchOperator, left: number, right: number): boolean {
	if (Number.isNaN(left) || Number.isNaN(right)) {
		return false;
	}
	switch (op) {
		case "ge":
			return left >= right;
		case "gt":
			return left > right;
		case "le":
			return left <= right;
		case "lt":
			return left < right;
		default:
			return left === right;
	}
}

function includesInsensitive(haystack: string, needle: string): boolean {
	return haystack.toLowerCase().includes(needle.toLowerCase());
}

function parseJsonStrings(value: string | undefined): string[] {
	if (!value) {
		return [];
	}
	const fromJson = parseJsonArray(value);
	if (fromJson.length > 0 || value.trim().startsWith("[")) {
		return fromJson;
	}
	return value
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
}

function matchLabeledList(items: string[], expr: string): boolean {
	const groups = expr
		.split("|")
		.map((group) =>
			group
				.split(",")
				.map((part) => part.trim())
				.filter(Boolean),
		)
		.filter((group) => group.length > 0);
	if (groups.length === 0) {
		return false;
	}
	return groups.some((needles) => needles.every((needle) => items.some((item) => includesInsensitive(item, needle))));
}

function titleBag(row: ListFilterRow): string[] {
	return [row.title, ...titleStrings(row.titles), ...splitTitleList(row.userSynonyms)];
}

function seasonYear(row: ListFilterRow): number {
	const match = /(\d{4})/.exec(row.season ?? "");
	return match ? Number(match[1]) : Number.NaN;
}

/**
 * Taiga-style list filter: space-separated AND terms.
 * Numeric fields support = >= > <= < (e.g. score:>=80, eps:>12, year:2024).
 * genre/tags values: comma AND, pipe OR.
 */
export function animeMatchesListFilter(row: ListFilterRow, rawFilter: string | null | undefined): boolean {
	const text = (rawFilter ?? "").trim();
	if (!text) {
		return true;
	}
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length === 0) {
		return true;
	}
	const titles = titleBag(row);
	const genres = parseJsonStrings(row.genres);
	const tags = parseJsonStrings(row.tags);
	const notes = row.notes ?? "";

	for (const word of words) {
		const term = parseTerm(word);
		const amount = Number(term.value);
		switch (term.field) {
			case "none":
				if (
					!titles.some((title) => includesInsensitive(title, term.value)) &&
					!genres.some((genre) => includesInsensitive(genre, term.value)) &&
					!includesInsensitive(notes, term.value)
				) {
					return false;
				}
				break;
			case "title":
				if (!titles.some((title) => includesInsensitive(title, term.value))) {
					return false;
				}
				break;
			case "genre":
				if (!matchLabeledList(genres, term.value)) {
					return false;
				}
				break;
			case "tags":
				if (!matchLabeledList(tags, term.value)) {
					return false;
				}
				break;
			case "note":
				if (!includesInsensitive(notes, term.value)) {
					return false;
				}
				break;
			case "type":
				if (!matchLabeledList([row.type ?? ""], term.value)) {
					return false;
				}
				break;
			case "season":
				if (!includesInsensitive(row.season ?? "", term.value)) {
					return false;
				}
				break;
			case "id":
				if (!checkNumber(term.op, row.id ?? Number.NaN, amount)) {
					return false;
				}
				break;
			case "eps":
				if (!checkNumber(term.op, row.episodes ?? Number.NaN, amount)) {
					return false;
				}
				break;
			case "score":
				if (!checkNumber(term.op, row.score ?? Number.NaN, amount)) {
					return false;
				}
				break;
			case "popular": {
				const want = parseBool(term.value);
				const isPopular = (row.popularRank ?? 0) > 0;
				if (want == null || isPopular !== want) {
					return false;
				}
				break;
			}
			case "year":
				if (!checkNumber(term.op, seasonYear(row), amount)) {
					return false;
				}
				break;
		}
	}
	return true;
}
