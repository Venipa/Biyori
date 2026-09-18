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

function dateOnly(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	return value.slice(0, 10);
}

export function animeAiringNotice(input: AnimeAiringNoticeInput): AnimeAiringNotice | null {
	const status = input.airingStatus.trim();
	const ranks = rankLines(input);
	const last = input.lastAiredEpisode > 0 ? `Last aired episode ${input.lastAiredEpisode}` : null;
	const nextAt = input.nextAiringAt ? airDateLine(input.nextAiringAt) : null;
	const nextEp = input.lastAiredEpisode > 0 ? input.lastAiredEpisode + 1 : 1;

	let title = "";
	let description: string | undefined;

	if (status === "Hiatus") {
		title = "Hiatus";
		description = [last, nextAt ? `Next airs ${nextAt}` : null].filter(Boolean).join(". ") || undefined;
	} else if (status === "Cancelled") {
		title = "Cancelled";
	} else if (status === "Currently airing") {
		if (nextAt) {
			title = `Episode ${nextEp} airs`;
			description = nextAt;
		} else {
			title = "Currently airing";
			description = last ?? undefined;
		}
	} else if (status === "Not yet released") {
		title = "Not yet released";
		description = nextAt ? `Premieres ${nextAt}` : undefined;
	} else if (status === "Finished airing") {
		title = "Finished airing";
		description = dateOnly(input.endDate) ?? last ?? undefined;
	}

	if (!title && ranks.length === 0) {
		return null;
	}
	return { title, description, ranks };
}
