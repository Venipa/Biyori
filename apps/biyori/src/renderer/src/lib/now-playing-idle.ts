import { episodeInAirWindow, nextListEpisode } from "../../../shared/episode-window";
import { formatAiringDayLabel } from "./format-date";

export const CONTINUE_WATCHING_LIMIT = 20;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type IdleHistoryRow = {
	animeId: number;
	episode: number;
};

export type IdleListedRow = {
	id: number;
	title: string;
	status?: string;
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

const CONTINUE_STATUSES = new Set(["Currently watching", "Completed", "Plan to watch"]);

export function buildContinueWatching(historyRows: readonly IdleHistoryRow[], listed: readonly IdleListedRow[], now: number): ContinueWatchingItem[] {
	const historyRank = new Map<number, number>();
	for (const row of historyRows) {
		if (row.animeId <= 0 || row.episode <= 0 || historyRank.has(row.animeId)) {
			continue;
		}
		historyRank.set(row.animeId, historyRank.size);
	}
	const ranked: Array<ContinueWatchingItem & { rank: number }> = [];
	for (const row of listed) {
		if (!row.status || !CONTINUE_STATUSES.has(row.status)) {
			continue;
		}
		const nextEpisode = nextListEpisode(row.episodesWatched);
		if (!row.libraryEpisodes?.includes(nextEpisode) || !episodeInAirWindow(row, now)) {
			continue;
		}
		ranked.push({
			animeId: row.id,
			title: row.title,
			nextEpisode,
			coverUrl: row.coverUrl ?? undefined,
			type: row.type ?? undefined,
			episodes: row.episodes,
			rank: historyRank.get(row.id) ?? Number.POSITIVE_INFINITY,
		});
	}
	ranked.sort((left, right) => left.rank - right.rank || left.title.localeCompare(right.title));
	return ranked.slice(0, CONTINUE_WATCHING_LIMIT).map(({ rank: _rank, ...item }) => item);
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
