import { t } from "@biyori/translations/react";
import type { inferRouterOutputs } from "@trpc/server";
import { formatClock } from "@/mainview/lib/format-date";
import type { ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";
import type { SelectedAnime } from "@/mainview/lib/selected-anime";
import type { AppRouter } from "@/shared/app-router";

export type NowPlayingSnapshot = NonNullable<inferRouterOutputs<AppRouter>["media"]["nowPlaying"]>;

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
	return t("nowPlaying.episodeAt", { episode: item.nextEpisode, time: formatClock(item.nextAiringAt) });
}

export function episodeLine(item: ContinueWatchingItem): string {
	const total = item.episodes != null && item.episodes > 0 ? item.episodes : null;
	return total != null ? t("nowPlaying.episodeOf", { episode: item.nextEpisode, total }) : t("nowPlaying.episodeNumber", { episode: item.nextEpisode });
}

export function formatNowPlayingLine(episode: number | null | undefined, group: string | null | undefined, isMovie: boolean = false): string {
	if (isMovie) {
		return t("nowPlaying.movie");
	}
	const episodeLineText = episode != null ? t("nowPlaying.episodeNumber", { episode }) : t("nowPlaying.episodeUnknown");
	if (group) {
		return t("nowPlaying.episodeBy", { episodeLine: episodeLineText, group });
	}
	return episodeLineText;
}
