import { basename } from "node:path";
import { extendTitle, PLAYER_MARKERS, parseFilename as parseFilenameRaw, parsePath } from "@biyori/recognition";
import { hana, playerMarkers } from "./hana-client";
import type { NowPlayingMedia, ParsedPlayback } from "./types";

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const markers = playerMarkers();
const PLAYER_SUFFIX = new RegExp(`\\s+-\\s+(${(markers.length ? markers : PLAYER_MARKERS).map(escapeRegExp).join("|")}).*$`, "i");

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

function stripPlayerSuffix(value: string): string {
	return value
		.replace(PLAYER_SUFFIX, "")
		.replace(STREAM_SUFFIX, "")
		.replace(/^watch\s+/i, "")
		.trim();
}

function toPlayback(parsed: ReturnType<typeof parseFilenameRaw>, filePath: string | null): ParsedPlayback | null {
	if (!parsed?.title) {
		return null;
	}
	return {
		title: extendTitle(parsed),
		rawTitle: parsed.title,
		season: parsed.season,
		year: parsed.year,
		episode: parsed.episode,
		group: parsed.group,
		filePath,
	};
}

export async function parsePlayback(media: NowPlayingMedia, options: ParsePlaybackOptions = {}): Promise<ParsedPlayback | null> {
	const ignored = ignoredTokens(options.ignoredStrings);
	const input = media.filePath || media.title;
	if (!input) {
		return null;
	}
	try {
		const parsed = await hana.parse({
			input,
			path: Boolean(media.filePath),
			ignored,
		});
		if (!parsed) {
			return null;
		}
		return {
			title: parsed.title,
			rawTitle: parsed.rawTitle,
			season: parsed.season,
			year: parsed.year,
			episode: parsed.episode,
			group: parsed.group,
			filePath: media.filePath,
		};
	} catch {
		return null;
	}
}

export function parseFilename(filename: string): ParsedPlayback | null {
	const stripped = stripPlayerSuffix(filename);
	return toPlayback(parsePath(stripped) ?? parseFilenameRaw(basename(stripped)), filename);
}
