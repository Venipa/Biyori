import { t } from "@biyori/translations/react";
import { formatLocalDateTime, formatTimeAgo } from "./format-date";

export type AnimeAiringNoticeInput = {
	airingStatus: string;
	lastAiredEpisode: number;
	nextAiringAt?: string | null;
	endDate?: string | null;
	ratedRank?: number | null;
	popularRank?: number | null;
};

export type AnimeRankLine = {
	kind: "rated" | "popular";
	rank: number;
};

export type AnimeAiringNotice = {
	title: string;
	description?: string;
	ranks: AnimeRankLine[];
};

function airDateLine(iso: string): string {
	const absolute = formatLocalDateTime(iso);
	const relative = formatTimeAgo(iso);
	if (relative && relative !== "-" && relative !== absolute) {
		return `${absolute} (${relative})`;
	}
	return absolute;
}

function rankLines(input: AnimeAiringNoticeInput): AnimeRankLine[] {
	const ranks: AnimeRankLine[] = [];
	if (input.ratedRank != null && input.ratedRank > 0) {
		ranks.push({ kind: "rated", rank: input.ratedRank });
	}
	if (input.popularRank != null && input.popularRank > 0) {
		ranks.push({ kind: "popular", rank: input.popularRank });
	}
	return ranks;
}

export function airingStatusLabel(status: string | null | undefined): string {
	switch (status?.trim()) {
		case "Currently airing":
			return t("anime.currentlyAiring");
		case "Finished airing":
			return t("anime.finishedAiring");
		case "Finished":
			return t("anime.finished");
		case "Not yet released":
			return t("anime.notYetReleased");
		case "Cancelled":
			return t("anime.cancelled");
		case "Hiatus":
			return t("anime.hiatus");
		default: {
			const trimmed = status?.trim();
			return trimmed ? trimmed : t("common.unknown");
		}
	}
}

function dateOnly(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	return value.slice(0, 10);
}

export function animeAiringNotice(input: AnimeAiringNoticeInput): AnimeAiringNotice | null {
	const status = input.airingStatus.trim();
	const ranks = rankLines(input);
	const last = input.lastAiredEpisode > 0 ? t("anime.lastAired", { episode: input.lastAiredEpisode }) : null;
	const nextAt = input.nextAiringAt ? airDateLine(input.nextAiringAt) : null;
	const nextEp = input.lastAiredEpisode > 0 ? input.lastAiredEpisode + 1 : 1;

	let title = "";
	let description: string | undefined;

	if (status === "Hiatus") {
		title = t("anime.hiatus");
		description = [last, nextAt ? t("anime.nextAirs", { when: nextAt }) : null].filter(Boolean).join(". ") || undefined;
	} else if (status === "Cancelled") {
		title = t("anime.cancelled");
	} else if (status === "Currently airing") {
		if (nextAt) {
			title = t("anime.episodeAirs", { episode: nextEp });
			description = nextAt;
		} else {
			title = t("anime.currentlyAiring");
			description = last ?? undefined;
		}
	} else if (status === "Not yet released") {
		title = t("anime.notYetReleased");
		description = nextAt ? t("anime.premieres", { when: nextAt }) : undefined;
	} else if (status === "Finished airing") {
		title = t("anime.finishedAiring");
		description = dateOnly(input.endDate) ?? last ?? undefined;
	}

	if (!title && ranks.length === 0) {
		return null;
	}
	return { title, description, ranks };
}
