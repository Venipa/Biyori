import type { AppSettings } from "../../lib/schemas/app-settings";
import type { HistoryChanges } from "../../lib/schemas/history-changes";
import type { QueuePayload } from "./queue";
import type { MatchedAnime } from "./types";

type ProgressMatch = Pick<MatchedAnime, "episodes" | "episodesWatched" | "status" | "rewatching" | "timesRewatched" | "dateStarted" | "dateCompleted">;

export function marksEpisodeAdvanced(current: { episodesWatched: number; rewatching: boolean } | undefined, payload: { progress?: number; rewatching?: boolean }): boolean {
	if (!current || payload.progress == null) {
		return false;
	}
	if (current.rewatching || payload.rewatching === true) {
		return false;
	}
	return payload.progress > current.episodesWatched;
}

export function canApplyProgress(match: ProgressMatch, episode: number, settings: Pick<AppSettings, "ignoreOutOfRangeEpisode">): boolean {
	const progress = match.rewatching && match.episodes > 0 && match.episodesWatched >= match.episodes ? 0 : match.episodesWatched;
	if (episode <= progress) {
		return false;
	}
	if (match.episodes > 0 && episode > match.episodes) {
		return false;
	}
	if (settings.ignoreOutOfRangeEpisode && episode > progress + 1) {
		return false;
	}
	if (match.status === "Completed" && !match.rewatching) {
		return false;
	}
	return true;
}

export function progressPayload(match: ProgressMatch, episode: number): QueuePayload {
	const finished = match.episodes > 0 && episode >= match.episodes;
	const completedRewatch = finished && match.rewatching;
	return {
		progress: episode,
		status: finished ? "Completed" : "Currently watching",
		rewatching: completedRewatch ? false : undefined,
		timesRewatched: completedRewatch ? match.timesRewatched + 1 : undefined,
		dateStarted: episode >= 1 && !match.dateStarted ? new Date().toISOString().slice(0, 10) : undefined,
		dateCompleted: finished ? new Date().toISOString().slice(0, 10) : undefined,
	};
}

export function withAppliedProgress<T extends ProgressMatch>(match: T, episode: number): T {
	const payload = progressPayload(match, episode);
	return {
		...match,
		episodesWatched: payload.progress ?? episode,
		status: payload.status ?? match.status,
		rewatching: payload.rewatching ?? match.rewatching,
		timesRewatched: payload.timesRewatched ?? match.timesRewatched,
		dateStarted: payload.dateStarted !== undefined ? payload.dateStarted : match.dateStarted,
		dateCompleted: payload.dateCompleted !== undefined ? payload.dateCompleted : match.dateCompleted,
	};
}

type ListState = {
	status: string;
	episodesWatched: number;
	score: number | null;
	notes: string;
	rewatching: boolean;
	timesRewatched: number;
	dateStarted: string | null;
	dateCompleted: string | null;
};

/** Diff a queued payload against the current list entry; a missing entry counts every provided field as changed. */
export function historyChanges(current: ListState | undefined, payload: QueuePayload): HistoryChanges {
	const changes: HistoryChanges = {};
	if (payload.progress != null && payload.progress !== current?.episodesWatched) {
		changes.episode = payload.progress;
	}
	if (payload.status !== undefined && payload.status !== current?.status) {
		changes.status = payload.status;
	}
	if (payload.score !== undefined && payload.score !== current?.score) {
		changes.score = payload.score;
	}
	if (payload.notes !== undefined && payload.notes !== (current?.notes ?? "")) {
		changes.notes = true;
	}
	if (
		(payload.rewatching !== undefined && payload.rewatching !== current?.rewatching) ||
		(payload.timesRewatched !== undefined && payload.timesRewatched !== current?.timesRewatched)
	) {
		changes.rewatch = true;
	}
	if (
		(payload.dateStarted !== undefined && payload.dateStarted !== current?.dateStarted) ||
		(payload.dateCompleted !== undefined && payload.dateCompleted !== current?.dateCompleted)
	) {
		changes.dates = true;
	}
	return changes;
}
