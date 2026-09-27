import type { inferRouterOutputs } from "@trpc/server";
import { formatClock } from "@/mainview/lib/format-date";
import { type ContinueWatchingItem, SEVEN_DAYS_MS } from "@/mainview/lib/now-playing-idle";
import type { SelectedAnime } from "@/mainview/lib/selected-anime";
import type { AppRouter } from "@/shared/app-router";

export type NowPlayingSnapshot = NonNullable<inferRouterOutputs<AppRouter>["media"]["nowPlaying"]>;
export type HistoryRow = inferRouterOutputs<AppRouter>["history"]["list"]["history"][number];

export function lastPlayedArt(
	row: { animeId: number | null; bannerUrl: string | null; coverUrl: string | null } | null,
): { id: number; url: string; kind: "banner" | "cover" } | null {
	if (row?.animeId == null) {
		return null;
	}
	if (row.bannerUrl) {
		return { id: row.animeId, url: row.bannerUrl, kind: "banner" };
	}
	if (row.coverUrl) {
		return { id: row.animeId, url: row.coverUrl, kind: "cover" };
	}
	return null;
}

export function selectedFromContinue(item: ContinueWatchingItem): SelectedAnime {
	return {
		id: item.animeId,
		title: item.title,
		folder: "",
		episodes: item.episodes ?? 0,
		episodesWatched: Math.max(0, item.nextEpisode - 1),
		status: "Currently watching",
		notes: "",
	};
}

export function airingCaption(item: ContinueWatchingItem): string {
	return `Episode ${item.nextEpisode} at ${formatClock(item.nextAiringAt)}`;
}

export function earlierThanLabel(days: number): string {
	return `Earlier than ${days} ${days === 1 ? "day" : "days"}`;
}

export function episodeLine(item: ContinueWatchingItem): string {
	const total = item.episodes != null && item.episodes > 0 ? item.episodes : null;
	return total != null ? `Episode ${item.nextEpisode} of ${total}` : `Episode ${item.nextEpisode}`;
}

export function countWatchedLastWeek(rows: HistoryRow[]): number {
	const cutoff = Date.now() - SEVEN_DAYS_MS;
	let count = 0;
	for (const row of rows) {
		if (row.episode <= 0) {
			continue;
		}
		const time = Date.parse(row.lastModified);
		if (!Number.isNaN(time) && time >= cutoff) {
			count += 1;
		}
	}
	return count;
}

export function formatNowPlayingLine(episode: number | null | undefined, group: string | null | undefined, isMovie: boolean = false): string {
	if (isMovie) {
		return "Movie";
	}
	const episodePart = episode != null ? `Episode ${episode}` : "Episode unknown";
	if (group) {
		return `${episodePart} by ${group}`;
	}
	return episodePart;
}
