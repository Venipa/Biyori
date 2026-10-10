import { t } from "@biyori/translations/react";
import type { SeasonGroupBy, SeasonItem, SeasonSortBy, SeasonViewAs } from "@/lib/schemas/seasons";
import { airingStatusLabel } from "./anime-airing-notice";
import { animeTypeLabel } from "./anime-list-filter";

export type SeasonGroup = {
	key: string;
	label: string;
	items: SeasonItem[];
};

function dateKey(value: string | null): number {
	if (!value) {
		return Number.POSITIVE_INFINITY;
	}
	const time = Date.parse(value);
	return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function sortSeasonItems(items: SeasonItem[], sortBy: SeasonSortBy): SeasonItem[] {
	const next = [...items];
	next.sort((a, b) => {
		switch (sortBy) {
			case "date":
				return dateKey(a.startDate) - dateKey(b.startDate) || (a.title ?? "").localeCompare(b.title ?? "");
			case "episodes":
				return (b.episodes || 0) - (a.episodes || 0) || (a.title ?? "").localeCompare(b.title ?? "");
			case "score":
				return b.averageScore - a.averageScore || (a.title ?? "").localeCompare(b.title ?? "");
			case "title":
				return (a.title ?? "").localeCompare(b.title ?? "");
			default:
				return b.popularity - a.popularity || (a.title ?? "").localeCompare(b.title ?? "");
		}
	});
	return next;
}

function airingGroupKey(status: string): { key: string; label: string; order: number } {
	switch (status) {
		case "Currently airing":
			return { key: "airing", label: t("anime.currentlyAiring"), order: 0 };
		case "Not yet released":
			return { key: "notyet", label: t("anime.notYetReleased"), order: 1 };
		default:
			return { key: "finished", label: t("anime.finishedAiring"), order: 2 };
	}
}

function listGroupKey(inList: boolean): { key: string; label: string; order: number } {
	return inList ? { key: "inlist", label: t("seasons.inList"), order: 0 } : { key: "notinlist", label: t("seasons.notInList"), order: 1 };
}

function typeGroupKey(format: string): { key: string; label: string; order: number } {
	const name = format || "TV";
	return { key: name, label: animeTypeLabel(name), order: 0 };
}

function releaseMonth(index: number): string | undefined {
	switch (index) {
		case 0:
			return t("seasons.monthJan");
		case 1:
			return t("seasons.monthFeb");
		case 2:
			return t("seasons.monthMar");
		case 3:
			return t("seasons.monthApr");
		case 4:
			return t("seasons.monthMay");
		case 5:
			return t("seasons.monthJun");
		case 6:
			return t("seasons.monthJul");
		case 7:
			return t("seasons.monthAug");
		case 8:
			return t("seasons.monthSep");
		case 9:
			return t("seasons.monthOct");
		case 10:
			return t("seasons.monthNov");
		case 11:
			return t("seasons.monthDec");
		default:
			return undefined;
	}
}

function releaseDateGroupKey(startDate: string | null): { key: string; label: string; order: number } {
	const match = startDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate) : null;
	const month = match ? releaseMonth(Number(match[2]) - 1) : undefined;
	const day = match ? Number(match[3]) : Number.NaN;
	if (!match || !month || day < 1 || day > 31) {
		return { key: "unknown", label: t("common.unknown"), order: Number.MAX_SAFE_INTEGER };
	}
	return { key: startDate ?? "unknown", label: t("seasons.dateLabel", { month, day, year: match[1] }), order: dateKey(startDate) };
}

function seasonGroupMeta(item: SeasonItem, groupBy: SeasonGroupBy, inListIds: ReadonlySet<number>): { key: string; label: string; order: number } {
	switch (groupBy) {
		case "list":
			return listGroupKey(inListIds.has(item.id));
		case "type":
			return typeGroupKey(item.format);
		case "date":
			return releaseDateGroupKey(item.startDate);
		default:
			return airingGroupKey(item.status);
	}
}

export function groupSeasonItems(options: { items: SeasonItem[]; groupBy: SeasonGroupBy; inListIds: ReadonlySet<number> }): SeasonGroup[] {
	const buckets = new Map<string, { label: string; order: number; items: SeasonItem[] }>();

	for (const item of options.items) {
		const meta = seasonGroupMeta(item, options.groupBy, options.inListIds);
		const bucket = buckets.get(meta.key) ?? {
			label: meta.label,
			order: meta.order,
			items: [],
		};
		bucket.items.push(item);
		buckets.set(meta.key, bucket);
	}

	return [...buckets.entries()]
		.sort((a, b) => a[1].order - b[1].order || a[1].label.localeCompare(b[1].label))
		.map(([key, value]) => ({
			key,
			label: value.label,
			items: value.items,
		}));
}

export function shiftSeason(season: "WINTER" | "SPRING" | "SUMMER" | "FALL", year: number, delta: -1 | 1): { season: "WINTER" | "SPRING" | "SUMMER" | "FALL"; seasonYear: number } {
	const order = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;
	const index = order.indexOf(season);
	const nextIndex = index + delta;
	if (nextIndex < 0) {
		return { season: "FALL", seasonYear: year - 1 };
	}
	if (nextIndex > 3) {
		return { season: "WINTER", seasonYear: year + 1 };
	}
	return { season: order[nextIndex], seasonYear: year };
}

function seasonName(season: string): string {
	switch (season.toUpperCase()) {
		case "WINTER":
			return t("seasons.winter");
		case "SPRING":
			return t("seasons.spring");
		case "SUMMER":
			return t("seasons.summer");
		case "FALL":
			return t("seasons.fall");
		default:
			return season ? `${season.charAt(0)}${season.slice(1).toLowerCase()}` : "";
	}
}

export function formatSeasonLabel(season: string, year: number | null | undefined): string {
	if (!season && !year) {
		return "";
	}
	const label = season ? seasonName(season) : "";
	if (label && year) {
		return `${label} ${year}`;
	}
	return label || String(year ?? "");
}

export function formatAiredRange(item: SeasonItem): string {
	const start = item.startDate ?? t("seasons.unknownMark");
	const status = airingStatusLabel(item.status);
	if (item.endDate && item.endDate !== item.startDate) {
		return t("seasons.airedRangeTo", { start, end: item.endDate, status });
	}
	return t("seasons.airedRange", { start, status });
}

export function formatPopularity(popularity: number): string {
	if (popularity <= 0) {
		return t("seasons.unknownMark");
	}
	return t("seasons.users", { amount: popularity.toLocaleString() });
}

export function formatScore(score: number): string {
	return score > 0 ? `${score}%` : t("seasons.unknownMark");
}

export function imageFooterText(item: SeasonItem, sortBy: SeasonSortBy): string {
	switch (sortBy) {
		case "date":
			return item.startDate ?? t("seasons.unknownMark");
		case "episodes":
			return item.episodes > 0 ? t("seasons.episodeCount", { count: item.episodes }) : t("common.unknown");
		case "score":
			return formatScore(item.averageScore);
		case "title":
			return item.title;
		default:
			return formatPopularity(item.popularity);
	}
}

export function airingBarClass(status: string): string {
	switch (status) {
		case "Currently airing":
			return "bg-emerald-600 text-white";
		case "Not yet released":
			return "bg-rose-600 text-white";
		default:
			return "bg-sky-600 text-white";
	}
}

function stampMonth(index: number): string | undefined {
	switch (index) {
		case 0:
			return t("seasons.stampJan");
		case 1:
			return t("seasons.stampFeb");
		case 2:
			return t("seasons.stampMar");
		case 3:
			return t("seasons.stampApr");
		case 4:
			return t("seasons.stampMay");
		case 5:
			return t("seasons.stampJun");
		case 6:
			return t("seasons.stampJul");
		case 7:
			return t("seasons.stampAug");
		case 8:
			return t("seasons.stampSep");
		case 9:
			return t("seasons.stampOct");
		case 10:
			return t("seasons.stampNov");
		case 11:
			return t("seasons.stampDec");
		default:
			return undefined;
	}
}

/** Printed-guide date stub. `startDate` is `YYYY-MM-DD` from Anilist. */
export function airStamp(startDate: string | null): { month: string; day: string } | null {
	if (!startDate) {
		return null;
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
	if (!match) {
		return null;
	}
	const month = stampMonth(Number(match[2]) - 1);
	const day = Number(match[3]);
	if (!month || !Number.isFinite(day) || day < 1 || day > 31) {
		return null;
	}
	return { month, day: String(day) };
}

/** Poster height for the skyline view. Unrated titles stay short so rated ones tower. */
export function skylinePosterHeight(score: number): number {
	if (score <= 0) {
		return 72;
	}
	const clamped = Math.min(100, score);
	return 88 + Math.round((clamped / 100) * 96);
}

export function formatPopularityCompact(popularity: number): string {
	if (popularity <= 0) {
		return "?";
	}
	if (popularity >= 1_000_000) {
		return `${(popularity / 1_000_000).toFixed(1)}m`;
	}
	if (popularity >= 10_000) {
		return `${Math.round(popularity / 1000)}k`;
	}
	if (popularity >= 1000) {
		return `${(popularity / 1000).toFixed(1)}k`;
	}
	return String(popularity);
}

export function seasonGridColumns(viewAs: SeasonViewAs, width: number): number {
	if (viewAs === "guide") {
		return 1;
	}
	if (viewAs === "skyline") {
		if (width >= 1280) {
			return 10;
		}
		if (width >= 1024) {
			return 8;
		}
		if (width >= 768) {
			return 6;
		}
		if (width >= 640) {
			return 5;
		}
		return 4;
	}
	if (viewAs === "images") {
		if (width >= 1280) {
			return 6;
		}
		if (width >= 1024) {
			return 5;
		}
		if (width >= 768) {
			return 4;
		}
		if (width >= 640) {
			return 3;
		}
		return 2;
	}
	if (width >= 1280) {
		return 3;
	}
	if (width >= 768) {
		return 2;
	}
	return 1;
}

export type SeasonVirtualItem<T> = { type: "header"; key: string; label: string; count: number } | { type: "row"; key: string; items: T[] };

export function flattenSeasonVirtualItems<T>(groups: Array<{ key: string; label: string; items: T[] }>, columns: number): SeasonVirtualItem<T>[] {
	const cols = Math.max(1, columns);
	const out: SeasonVirtualItem<T>[] = [];
	for (const group of groups) {
		out.push({ type: "header", key: `h-${group.key}`, label: group.label, count: group.items.length });
		for (let index = 0; index < group.items.length; index += cols) {
			out.push({ type: "row", key: `r-${group.key}-${index}`, items: group.items.slice(index, index + cols) });
		}
	}
	return out;
}
