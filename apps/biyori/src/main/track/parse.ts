import { basename, dirname } from "node:path";
import { parse } from "anitomy";
import type { NowPlayingMedia, ParsedPlayback } from "./types";

const PLAYER_SUFFIX = /\s+-\s+(mpv|vlc media player|vlc|mpc-hc|mpc-be|potplayer|kmplayer|gom player).*$/i;

const STREAM_SUFFIX = /\s+[|-]\s+(crunchyroll|hidive|netflix|plex|jellyfin|youtube|bilibili|funimation).*$/i;

export type ParsePlaybackOptions = {
	ignoredStrings?: string;
};

function ignoredTokens(raw: string | undefined): string[] {
	if (!raw) {
		return [];
	}
	return raw
		.split(/[\n,]+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function stripIgnored(value: string, ignored: string[]): string {
	let next = value;
	for (const token of ignored) {
		next = next.split(token).join(" ");
	}
	return next.replace(/\s+/g, " ").trim();
}

function stripPlayerSuffix(value: string): string {
	return value
		.replace(PLAYER_SUFFIX, "")
		.replace(STREAM_SUFFIX, "")
		.replace(/^watch\s+/i, "")
		.trim();
}

function parseAnimeName(source: string, filePath: string | null, ignored: string[]): ParsedPlayback | null {
	const parsed = parse(stripIgnored(source, ignored));
	const title = parsed?.title?.trim();
	if (!title) {
		return null;
	}
	const episode = parsed?.episode?.number;
	const group = parsed?.release?.group?.trim() || null;
	return {
		title,
		episode: episode && episode > 0 ? episode : null,
		group,
		filePath,
	};
}

export function parsePlayback(media: NowPlayingMedia, options: ParsePlaybackOptions = {}): ParsedPlayback | null {
	const ignored = ignoredTokens(options.ignoredStrings);
	if (media.filePath) {
		const fromFile = parseAnimeName(basename(media.filePath), media.filePath, ignored);
		if (fromFile) {
			return fromFile;
		}
		const fromParent = parseAnimeName(basename(dirname(media.filePath)), media.filePath, ignored);
		if (fromParent) {
			return fromParent;
		}
	}
	if (!media.title) {
		return null;
	}
	return parseAnimeName(stripPlayerSuffix(media.title), media.filePath, ignored);
}

export function parseFilename(filename: string): ParsedPlayback | null {
	const fromFile = parseAnimeName(basename(filename), filename, []);
	if (fromFile) {
		return fromFile;
	}
	return parseAnimeName(basename(dirname(filename)), filename, []);
}
