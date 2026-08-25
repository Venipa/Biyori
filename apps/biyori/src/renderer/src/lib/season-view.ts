import type {
	SeasonGroupBy,
	SeasonItem,
	SeasonSortBy,
} from "@/lib/schemas/seasons";

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

export function sortSeasonItems(
	items: SeasonItem[],
	sortBy: SeasonSortBy,
): SeasonItem[] {
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
			return { key: "airing", label: "Currently airing", order: 0 };
		case "Not yet released":
			return { key: "notyet", label: "Not yet released", order: 1 };
		default:
			return { key: "finished", label: "Finished airing", order: 2 };
	}
}

function listGroupKey(inList: boolean): { key: string; label: string; order: number } {
	return inList
		? { key: "inlist", label: "In list", order: 0 }
		: { key: "notinlist", label: "Not in list", order: 1 };
}

function typeGroupKey(format: string): { key: string; label: string; order: number } {
	return { key: format || "TV", label: format || "TV", order: 0 };
}

export function groupSeasonItems(options: {
	items: SeasonItem[];
	groupBy: SeasonGroupBy;
	inListIds: ReadonlySet<number>;
}): SeasonGroup[] {
	const buckets = new Map<
		string,
		{ label: string; order: number; items: SeasonItem[] }
	>();

	for (const item of options.items) {
		const meta =
			options.groupBy === "list"
				? listGroupKey(options.inListIds.has(item.id))
				: options.groupBy === "type"
					? typeGroupKey(item.format)
					: airingGroupKey(item.status);
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

export function shiftSeason(
	season: "WINTER" | "SPRING" | "SUMMER" | "FALL",
	year: number,
	delta: -1 | 1,
): { season: "WINTER" | "SPRING" | "SUMMER" | "FALL"; seasonYear: number } {
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

export function formatSeasonLabel(
	season: string,
	year: number | null | undefined,
): string {
	if (!season && !year) {
		return "";
	}
	const label = season
		? `${season.charAt(0)}${season.slice(1).toLowerCase()}`
		: "";
	if (label && year) {
		return `${label} ${year}`;
	}
	return label || String(year ?? "");
}

export function formatAiredRange(item: SeasonItem): string {
	const start = item.startDate ?? "?";
	const end =
		item.endDate && item.endDate !== item.startDate
			? ` to ${item.endDate}`
			: "";
	return `${start}${end} (${item.status})`;
}

export function formatPopularity(popularity: number): string {
	if (popularity <= 0) {
		return "?";
	}
	return `${popularity.toLocaleString()} users`;
}

export function formatScore(score: number): string {
	return score > 0 ? `${score}%` : "?";
}

export function imageFooterText(
	item: SeasonItem,
	sortBy: SeasonSortBy,
): string {
	switch (sortBy) {
		case "date":
			return item.startDate ?? "?";
		case "episodes":
			return item.episodes > 0
				? `${item.episodes} episode${item.episodes === 1 ? "" : "s"}`
				: "Unknown";
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
