import { hana } from "./hana-client";
import type { NowPlayingMedia, ParsedPlayback } from "./types";

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
