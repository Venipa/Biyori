import { parseJsonArray } from "@/lib/parse-json-array";
import { splitTitleList } from "@/lib/split-title-list";

export type ListFilterRow = {
	title: string;
	alternativeTitles?: string;
	userSynonyms?: string;
	genres?: string;
	notes?: string;
	type?: string;
	season?: string;
	id?: number | null;
	episodes?: number;
	score?: number | null;
};

type SearchField = "none" | "id" | "eps" | "title" | "genre" | "note" | "type" | "season" | "year" | "score";

type SearchOperator = "eq" | "ge" | "gt" | "le" | "lt";

type SearchTerm = {
	field: SearchField;
	op: SearchOperator;
	value: string;
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

function parseTerm(raw: string): SearchTerm {
	const match = /^([a-z]+):([!<>=]+)?(.+)$/i.exec(raw);
	if (!match) {
		return { field: "none", op: "eq", value: raw };
	}
	const prefix = match[1].toLowerCase();
	const op = parseOperator(match[2]);
	const value = match[3];
	switch (prefix) {
		case "id":
			return { field: "id", op, value };
		case "eps":
			return { field: "eps", op, value };
		case "title":
			return { field: "title", op, value };
		case "genre":
			return { field: "genre", op, value };
		case "note":
			return { field: "note", op, value };
		case "type":
			return { field: "type", op, value };
		case "season":
			return { field: "season", op, value };
		case "year":
			return { field: "year", op, value };
		case "score":
			return { field: "score", op, value };
		default:
			return { field: "none", op: "eq", value: raw };
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

function titleBag(row: ListFilterRow): string[] {
	return [row.title, ...splitTitleList(row.alternativeTitles), ...splitTitleList(row.userSynonyms)];
}

function seasonYear(row: ListFilterRow): number {
	const match = /(\d{4})/.exec(row.season ?? "");
	return match ? Number(match[1]) : Number.NaN;
}

/**
 * Taiga-style list filter: space-separated AND terms.
 * Numeric fields support = >= > <= < (e.g. score:>=80, eps:>12, year:2024).
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
				if (!genres.some((genre) => includesInsensitive(genre, term.value))) {
					return false;
				}
				break;
			case "note":
				if (!includesInsensitive(notes, term.value)) {
					return false;
				}
				break;
			case "type":
				if (!includesInsensitive(row.type ?? "", term.value)) {
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
			case "year":
				if (!checkNumber(term.op, seasonYear(row), amount)) {
					return false;
				}
				break;
		}
	}
	return true;
}
