import type { TitleParts } from "./types";

export function extendTitle(parsed: TitleParts): string {
	let title = parsed.title.trim();
	if (!title) {
		return "";
	}
	if (parsed.season != null && parsed.season > 1) {
		title = `${title} Season ${parsed.season}`;
	}
	if (parsed.year != null && parsed.year > 0) {
		title = `${title} (${parsed.year})`;
	}
	return title;
}
