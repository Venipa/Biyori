import { formatAiringDayLabel } from "./format-date";

export const CONTINUE_WATCHING_LIMIT = 20;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type IdleHistoryRow = {
	animeId: number;
	title: string;
	episode: number;
};

export type IdleListedRow = {
	id: number;
	title: string;
	episodes: number;
	episodesWatched: number;
	lastAiredEpisode: number;
	nextAiringAt?: string | null;
	coverUrl?: string | null;
	type?: string | null;
	libraryEpisodes?: number[];
};

export type ContinueWatchingItem = {
	animeId: number;
	title: string;
	nextEpisode: number;
	coverUrl?: string;
	type?: string;
	episodes?: number;
	nextAiringAt?: string;
};

export type UpcomingItem = {
	id: number;
	title: string;
};

export type AiringSoonGroup = {
	label: string;
	items: ContinueWatchingItem[];
};

export function nextUnwatchedEpisode(listed: IdleListedRow): number {
	return listed.lastAiredEpisode + 1;
}

export function buildContinueWatching(rows: IdleHistoryRow[], listedById: ReadonlyMap<number, IdleListedRow>, skipAnimeIds: ReadonlySet<number>): ContinueWatchingItem[] {
	const seen = new Set<number>();
	const items: ContinueWatchingItem[] = [];
	for (const row of rows) {
		if (row.animeId <= 0 || row.episode <= 0 || seen.has(row.animeId) || skipAnimeIds.has(row.animeId)) {
			continue;
		}
		seen.add(row.animeId);
		const listed = listedById.get(row.animeId);
		const nextEpisode = row.episode + 1;
		if (!listed?.libraryEpisodes?.includes(nextEpisode)) {
			continue;
		}
		items.push({
			animeId: row.animeId,
			title: listed.title ?? row.title,
			nextEpisode,
			coverUrl: listed.coverUrl ?? undefined,
			type: listed.type ?? undefined,
			episodes: listed.episodes,
		});
		if (items.length >= CONTINUE_WATCHING_LIMIT) {
			break;
		}
	}
	return items;
}

function airingMs(value: string | null | undefined): number | null {
	if (!value) {
		return null;
	}
	const time = Date.parse(value);
	return Number.isNaN(time) ? null : time;
}

export function buildAiringSoon(listed: IdleListedRow[], skipAnimeIds: ReadonlySet<number>, now: number): AiringSoonGroup[] {
	const laterEnd = now + SEVEN_DAYS_MS;
	const nowDate = new Date(now);
	const byDay = new Map<string, ContinueWatchingItem[]>();
	for (const row of listed) {
		if (skipAnimeIds.has(row.id)) {
			continue;
		}
		const at = airingMs(row.nextAiringAt);
		if (at == null || at <= now || at > laterEnd) {
			continue;
		}
		const nextEpisode = nextUnwatchedEpisode(row);
		if (row.episodesWatched >= nextEpisode) {
			continue;
		}
		const airingAt = new Date(at);
		const label = formatAiringDayLabel(airingAt, nowDate);
		const items = byDay.get(label) ?? [];
		items.push({
			animeId: row.id,
			title: row.title,
			nextEpisode,
			coverUrl: row.coverUrl ?? undefined,
			type: row.type ?? undefined,
			episodes: row.episodes,
			nextAiringAt: row.nextAiringAt ?? undefined,
		});
		byDay.set(label, items);
	}
	const groups: AiringSoonGroup[] = [];
	for (const [label, items] of byDay) {
		items.sort((a, b) => (airingMs(a.nextAiringAt) ?? 0) - (airingMs(b.nextAiringAt) ?? 0));
		groups.push({ label, items });
	}
	groups.sort((a, b) => (airingMs(a.items[0]?.nextAiringAt) ?? 0) - (airingMs(b.items[0]?.nextAiringAt) ?? 0));
	return groups;
}

export function buildUpcoming(listed: Array<IdleListedRow & { airingStatus: string }>, skipAnimeIds: ReadonlySet<number>): UpcomingItem[] {
	const items: UpcomingItem[] = [];
	for (const row of listed) {
		if (row.airingStatus !== "Not yet released" || skipAnimeIds.has(row.id)) {
			continue;
		}
		items.push({ id: row.id, title: row.title });
	}
	return items.toSorted((a, b) => a.title.localeCompare(b.title));
}
