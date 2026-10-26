import { parseHistoryStamp } from "./history-stamp";
import type { HistoryChanges } from "./schemas/history-changes";

export type HistoryEntry = {
	id: string;
	animeId: number;
	title: string;
	episode: number;
	lastModified: string;
	changes: HistoryChanges;
	coverUrl: string;
};

export type HistoryGroupRow = {
	ids: string[];
	animeId: number;
	title: string;
	coverUrl: string;
	/** latest entry time, epoch ms */
	time: number;
	changes: HistoryChanges;
	/** set when this row is an episode run */
	episodes?: { from: number; to: number; count: number };
};

export type HistoryDay = { key: string; time: number; rows: HistoryGroupRow[] };

/** Rows written before `changes` existed only knew the episode. */
function isEpisodeEntry(entry: HistoryEntry): boolean {
	return entry.changes.episode != null || Object.keys(entry.changes).length === 0;
}

function localDayKey(time: number): string {
	const date = new Date(time);
	return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Newest-first entries -> local days; consecutive episode entries of the same anime within a day become one row. */
export function groupHistory(entries: readonly HistoryEntry[]): HistoryDay[] {
	const days: HistoryDay[] = [];
	for (const entry of entries) {
		const time = parseHistoryStamp(entry.lastModified);
		if (Number.isNaN(time)) {
			continue;
		}
		const key = localDayKey(time);
		let day = days.at(-1);
		if (!day || day.key !== key) {
			day = { key, time, rows: [] };
			days.push(day);
		}
		const previous = day.rows.at(-1);
		const episode = isEpisodeEntry(entry) ? (entry.changes.episode ?? entry.episode) : null;
		if (episode != null && previous?.episodes && entry.animeId > 0 && previous.animeId === entry.animeId) {
			previous.ids.push(entry.id);
			previous.episodes = { from: Math.min(previous.episodes.from, episode), to: Math.max(previous.episodes.to, episode), count: previous.episodes.count + 1 };
			// older entry: keep the newer values already on the row
			previous.changes = { ...entry.changes, ...previous.changes };
			continue;
		}
		day.rows.push({
			ids: [entry.id],
			animeId: entry.animeId,
			title: entry.title,
			coverUrl: entry.coverUrl,
			time,
			changes: entry.changes,
			episodes: episode != null ? { from: episode, to: episode, count: 1 } : undefined,
		});
	}
	return days;
}

export const HISTORY_CHANGE_TYPES = ["episode", "status", "score", "notes", "rewatch", "dates"] as const;
export type HistoryChangeType = (typeof HISTORY_CHANGE_TYPES)[number];

/** Comma-separated route search value -> known types (unknown entries dropped). */
export function parseHistoryTypes(raw: string | undefined): HistoryChangeType[] {
	const parts = new Set((raw ?? "").split(","));
	return HISTORY_CHANGE_TYPES.filter((type) => parts.has(type));
}

/** No active types shows everything; otherwise the row needs any active type. */
export function matchesHistoryTypes(row: HistoryGroupRow, types: readonly HistoryChangeType[]): boolean {
	return types.length === 0 || types.some((type) => (type === "episode" ? row.episodes != null : row.changes[type] !== undefined));
}
