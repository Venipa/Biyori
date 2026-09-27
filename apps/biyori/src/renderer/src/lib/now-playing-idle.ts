import { episodeInAirWindow, nextListEpisode } from "../../../shared/episode-window";
import { formatAiringDayLabel } from "./format-date";

export const CONTINUE_WATCHING_LIMIT = 20;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const CONTINUE_STALE_MS = 30 * 24 * 60 * 60 * 1000;

export type IdleHistoryRow = {
	animeId: number;
	episode: number;
	playedAt?: string | null;
};

export type IdleListedRow = {
	id: number;
	title: string;
	status?: string;
	episodes: number;
	episodesWatched: number;
	lastAiredEpisode: number;
	nextAiringAt?: string | null;
	endDate?: string | null;
	lastUpdated?: string | null;
	coverUrl?: string | null;
	type?: string | null;
	libraryEpisodes?: number[];
	episodeSeenAt?: Record<string, string>;
};

export type ContinueWatchingGroups = {
	recent: ContinueWatchingItem[];
	older: ContinueWatchingItem[];
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

function timeMs(value: string | null | undefined): number | null {
	if (!value) {
		return null;
	}
	const time = Date.parse(value);
	return Number.isNaN(time) ? null : time;
}

function recentAirMs(row: IdleListedRow, now: number): number | null {
	const nextAt = timeMs(row.nextAiringAt);
	const next = nextListEpisode(row.episodesWatched);
	if (nextAt != null && nextAt <= now) {
		return nextAt;
	}
	// ponytail: weekly slot. A show on another cadence is off by that gap until per-episode air times are stored.
	if (nextAt != null && nextAt > now && row.lastAiredEpisode === next) {
		return nextAt - SEVEN_DAYS_MS;
	}
	const end = timeMs(row.endDate);
	if (end != null && end <= now && row.lastAiredEpisode >= next) {
		return end;
	}
	return null;
}

function isUpcoming(row: IdleListedRow, now: number): boolean {
	const nextAt = timeMs(row.nextAiringAt);
	return nextAt != null && nextAt > now && row.lastAiredEpisode < nextListEpisode(row.episodesWatched);
}

export function buildContinueWatching(historyRows: readonly IdleHistoryRow[], listed: readonly IdleListedRow[], now: number, staleMs = CONTINUE_STALE_MS): ContinueWatchingGroups {
	const historyRank = new Map<number, number>();
	const playedAt = new Map<number, number>();
	for (const row of historyRows) {
		if (row.animeId <= 0 || row.episode <= 0 || historyRank.has(row.animeId)) {
			continue;
		}
		historyRank.set(row.animeId, historyRank.size);
		const at = timeMs(row.playedAt);
		if (at != null) {
			playedAt.set(row.animeId, at);
		}
	}
	const ranked: Array<ContinueWatchingItem & { historyRank: number; upcoming: boolean; airMs: number | null; nextAt: number | null; updated: number; fileStale: boolean }> = [];
	for (const row of listed) {
		if (!row.status || !CONTINUE_STATUSES.has(row.status)) {
			continue;
		}
		const nextEpisode = nextListEpisode(row.episodesWatched);
		const seenAt = timeMs(row.episodeSeenAt?.[String(nextEpisode)]);
		if (!row.libraryEpisodes?.includes(nextEpisode) || seenAt == null || !episodeInAirWindow(row, now)) {
			continue;
		}
		ranked.push({
			animeId: row.id,
			title: row.title,
			nextEpisode,
			coverUrl: row.coverUrl ?? undefined,
			type: row.type ?? undefined,
			episodes: row.episodes,
			historyRank: historyRank.get(row.id) ?? Number.POSITIVE_INFINITY,
			upcoming: isUpcoming(row, now),
			airMs: recentAirMs(row, now),
			nextAt: timeMs(row.nextAiringAt),
			updated: playedAt.get(row.id) ?? 0,
			fileStale: now - seenAt >= staleMs,
		});
	}
	ranked.sort((left, right) => {
		if (left.historyRank !== right.historyRank) {
			return left.historyRank - right.historyRank;
		}
		if (left.upcoming !== right.upcoming) {
			return left.upcoming ? 1 : -1;
		}
		if (left.upcoming) {
			const soon = (left.nextAt ?? Number.POSITIVE_INFINITY) - (right.nextAt ?? Number.POSITIVE_INFINITY);
			if (soon !== 0) {
				return soon;
			}
		} else {
			const aired = (right.airMs ?? -1) - (left.airMs ?? -1);
			if (aired !== 0) {
				return aired;
			}
		}
		return right.updated - left.updated || left.title.localeCompare(right.title);
	});
	const recent: ContinueWatchingItem[] = [];
	const older: ContinueWatchingItem[] = [];
	for (const { historyRank: _historyRank, upcoming: _upcoming, airMs: _airMs, nextAt: _nextAt, updated, fileStale, ...item } of ranked) {
		const stale = fileStale || updated <= 0 || now - updated >= staleMs;
		const bucket = stale ? older : recent;
		if (bucket.length >= CONTINUE_WATCHING_LIMIT) {
			continue;
		}
		bucket.push(item);
	}
	return { recent, older };
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
