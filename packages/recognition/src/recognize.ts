import { basename } from "node:path";
import { parseFilename, parsePath, type ParseOptions, type ParsedFilename } from "@biyori/parser";
import { extendTitle } from "./extend-title";
import { matchParsed } from "./match";
import { candidatesInFolder } from "./path";
import type { TitleCandidate } from "./types";

export type Recognized<T extends TitleCandidate> = {
	parsed: ParsedFilename;
	title: string;
	match: T | null;
};

function fromParsed<T extends TitleCandidate>(
	parsed: ParsedFilename | null,
	candidates: T[],
): Recognized<T> | null {
	if (!parsed?.title) {
		return null;
	}
	return {
		parsed,
		title: extendTitle(parsed),
		match: matchParsed(parsed, candidates),
	};
}

export function recognizeFilename<T extends TitleCandidate>(
	name: string,
	candidates: T[],
	options?: ParseOptions,
): Recognized<T> | null {
	return fromParsed(parseFilename(name, options), candidates);
}

export function recognizePath<T extends TitleCandidate>(
	filePath: string,
	candidates: T[],
	options?: ParseOptions,
): Recognized<T> | null {
	const parsed = parsePath(filePath, options) ?? parseFilename(basename(filePath), options);
	return fromParsed(parsed, candidatesInFolder(filePath, candidates));
}
