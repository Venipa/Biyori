import { parseRelatedMedia, type RelatedMedia } from "../../lib/schemas/related-media";

function isTvSeasonFormat(value: string): boolean {
	const key = value.trim().toLowerCase();
	return key === "tv" || key === "tv short";
}

export type ListedForSeason = {
	id: number;
	type: string;
	related: RelatedMedia[] | string;
};

function relatedOf(row: ListedForSeason): RelatedMedia[] {
	return typeof row.related === "string" ? parseRelatedMedia(row.related) : row.related;
}

export function tvPrequelSeasonIndex(animeId: number, listed: readonly ListedForSeason[]): number | null {
	const byId = new Map<number, ListedForSeason>();
	for (const row of listed) {
		if (isTvSeasonFormat(row.type)) {
			byId.set(row.id, row);
		}
	}
	if (!byId.has(animeId)) {
		return null;
	}
	let current = animeId;
	let season = 1;
	const seen = new Set<number>();
	while (true) {
		if (seen.has(current)) {
			return null;
		}
		seen.add(current);
		const row = byId.get(current);
		if (!row) {
			return season;
		}
		const prequel = relatedOf(row).find((item) => item.relationType === "PREQUEL" && item.mediaType === "ANIME" && isTvSeasonFormat(item.format) && byId.has(item.id));
		if (!prequel) {
			return season;
		}
		current = prequel.id;
		season += 1;
	}
}
