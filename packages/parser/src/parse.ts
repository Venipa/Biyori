import { basename, dirname } from "node:path";
import {
	AUDIO_TERM,
	CRC32,
	EPISODE_RANGE,
	EPISODE_TOKEN,
	NUMBER_VERSION,
	NTH_SEASON,
	RESOLUTION,
	SEASON_EPISODE,
	SEASON_TOKEN,
	SOURCE_TERM,
	VERSION,
	VIDEO_EXT,
	VIDEO_TERM,
	YEAR,
	isSeasonWord,
} from "./patterns";
import { tokenize, type Token } from "./tokenize";
import type { ParsedFilename, ParseOptions } from "./types";

const INVALID_DIRS = new Set([
	"anime",
	"download",
	"downloads",
	"extra",
	"extras",
]);

function stripIgnored(value: string, ignored: string[]): string {
	let next = value;
	for (const token of ignored) {
		next = next.split(token).join(" ");
	}
	return next.replace(/\s+/g, " ").trim();
}

function toInt(value: string | undefined): number | null {
	if (!value) {
		return null;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function splitExt(name: string): { stem: string; extension: string } {
	const dot = name.lastIndexOf(".");
	if (dot <= 0) {
		return { stem: name, extension: "" };
	}
	const extension = name.slice(dot + 1);
	if (!VIDEO_EXT.test(extension)) {
		return { stem: name, extension: "" };
	}
	return { stem: name.slice(0, dot), extension: extension.toLowerCase() };
}

function markMatch(token: Token, pattern: RegExp): RegExpMatchArray | null {
	const match = token.text.match(pattern);
	if (!match) {
		return null;
	}
	token.used = true;
	return match;
}

function looksLikeEpisodeTitle(title: string): boolean {
	return /^\d{1,4}$/.test(title.trim());
}

function isInvalidDir(name: string): boolean {
	return name.includes(":") || INVALID_DIRS.has(name.toLowerCase());
}

function parseTokens(tokens: Token[]): Omit<ParsedFilename, "fileName" | "fileExtension"> {
	let season: number | null = null;
	let episodeLow: number | null = null;
	let episodeHigh: number | null = null;
	let year: number | null = null;
	let group: string | null = null;
	let videoResolution = "";
	const videoTerms: string[] = [];
	let releaseVersion = 1;

	const setEpisode = (low: number | null, high: number | null): void => {
		if (low == null) {
			return;
		}
		episodeLow = low;
		episodeHigh = high ?? low;
	};

	for (const token of tokens) {
		if (markMatch(token, RESOLUTION)) {
			videoResolution = token.text;
			continue;
		}
		if (markMatch(token, VIDEO_TERM) || markMatch(token, SOURCE_TERM) || markMatch(token, AUDIO_TERM)) {
			videoTerms.push(token.text);
			continue;
		}
		if (CRC32.test(token.text) && /[a-f]/i.test(token.text)) {
			token.used = true;
			continue;
		}
		const seasonEpisode = markMatch(token, SEASON_EPISODE);
		if (seasonEpisode) {
			season = toInt(seasonEpisode[1]);
			setEpisode(toInt(seasonEpisode[2]), toInt(seasonEpisode[4]));
			releaseVersion = toInt(seasonEpisode[3]) ?? releaseVersion;
			continue;
		}
		const seasonOnly = markMatch(token, SEASON_TOKEN);
		if (seasonOnly) {
			season = toInt(seasonOnly[1]);
			continue;
		}
		const episodeOnly = markMatch(token, EPISODE_TOKEN);
		if (episodeOnly) {
			setEpisode(toInt(episodeOnly[1]), toInt(episodeOnly[3]));
			releaseVersion = toInt(episodeOnly[2]) ?? releaseVersion;
			continue;
		}
		const range = markMatch(token, EPISODE_RANGE);
		if (range) {
			setEpisode(toInt(range[1]), toInt(range[3]));
			releaseVersion = toInt(range[2]) ?? releaseVersion;
		}
	}

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (token.used) {
			continue;
		}
		if (isSeasonWord(token.text)) {
			const next = tokens[i + 1];
			if (next && !next.used && toInt(next.text)) {
				token.used = true;
				next.used = true;
				season ??= toInt(next.text);
				continue;
			}
		}
		if (NTH_SEASON.test(token.text) && isSeasonWord(tokens[i + 1]?.text ?? "")) {
			token.used = true;
			tokens[i + 1].used = true;
			season ??= toInt(token.text);
		}
		const version = token.text.match(VERSION);
		if (version) {
			token.used = true;
			releaseVersion = toInt(version[1]) ?? releaseVersion;
			continue;
		}
		const numbered = token.text.match(NUMBER_VERSION);
		if (numbered && episodeLow == null) {
			token.used = true;
			setEpisode(toInt(numbered[1]), toInt(numbered[1]));
			releaseVersion = toInt(numbered[2]) ?? releaseVersion;
			continue;
		}
		if (YEAR.test(token.text)) {
			token.used = true;
			year ??= toInt(token.text);
		}
	}

	if (episodeLow == null) {
		for (const token of tokens) {
			if (token.used || token.enclosed) {
				continue;
			}
			const value = toInt(token.text);
			if (value == null || YEAR.test(token.text)) {
				continue;
			}
			token.used = true;
			setEpisode(value, value);
			break;
		}
	}

	const first = tokens[0];
	if (first?.enclosed && !first.used) {
		first.used = true;
		group = first.text;
	} else {
		const lastEnclosed = tokens.findLast((token) => token.enclosed && !token.used);
		if (lastEnclosed) {
			lastEnclosed.used = true;
			group = lastEnclosed.text;
		}
	}

	const title = tokens
		.filter((token) => !token.used && !token.enclosed && !isSeasonWord(token.text))
		.map((token) => token.text)
		.join(" ")
		.trim();

	return {
		title,
		season,
		year,
		episode: episodeHigh,
		episodeLow,
		episodeHigh,
		group,
		videoResolution,
		videoTerm: videoTerms[0] ?? "",
		releaseVersion,
	};
}

export function parseFilename(
	name: string,
	options: ParseOptions = {},
): ParsedFilename | null {
	const source = stripIgnored(name, options.ignored ?? []);
	if (!source) {
		return null;
	}
	const { stem, extension } = splitExt(source);
	const parsed = parseTokens(tokenize(stem));
	let title = parsed.title;
	let episode = parsed.episode;
	let episodeLow = parsed.episodeLow;
	let episodeHigh = parsed.episodeHigh;
	if (!episode && looksLikeEpisodeTitle(title)) {
		episode = toInt(title);
		episodeLow = episode;
		episodeHigh = episode;
		title = "";
	}
	if (!title && parsed.season == null && episode == null) {
		return null;
	}
	return {
		...parsed,
		title,
		episode,
		episodeLow,
		episodeHigh,
		fileName: name,
		fileExtension: extension,
	};
}

function mergeFromDir(
	current: ParsedFilename | null,
	dirName: string,
	options: ParseOptions,
): ParsedFilename | null {
	if (!dirName || isInvalidDir(dirName)) {
		return current;
	}
	const dir = parseFilename(dirName, options);
	const next: ParsedFilename = current ?? {
		title: "",
		season: null,
		year: null,
		episode: null,
		episodeLow: null,
		episodeHigh: null,
		group: null,
		videoResolution: "",
		videoTerm: "",
		releaseVersion: 1,
		fileName: dirName,
		fileExtension: "",
	};
	if (dir?.season != null && !dir.title) {
		next.season ??= dir.season;
		return next.title || next.episode != null ? next : current;
	}
	next.title ||= dir?.title || dirName;
	next.season ??= dir?.season ?? null;
	next.year ??= dir?.year ?? null;
	return next.title ? next : current;
}

export function parsePath(
	filePath: string,
	options: ParseOptions = {},
): ParsedFilename | null {
	let current = parseFilename(basename(filePath), options);
	let folder = dirname(filePath);
	for (let depth = 0; depth < 2; depth += 1) {
		const dirName = basename(folder);
		if (!dirName || dirName === folder) {
			break;
		}
		current = mergeFromDir(current, dirName, options);
		const parent = dirname(folder);
		if (parent === folder) {
			break;
		}
		folder = parent;
	}
	return current?.title ? current : null;
}
