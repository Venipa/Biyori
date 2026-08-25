import type { AppSettings } from "../../lib/schemas/app-settings";
import type { QueuePayload } from "./queue";
import type { MatchedAnime } from "./types";

type ProgressMatch = Pick<MatchedAnime, "episodes" | "episodesWatched" | "status" | "rewatching" | "timesRewatched" | "dateStarted">;

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
