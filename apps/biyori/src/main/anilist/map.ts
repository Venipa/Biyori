import { z } from "zod";
import type { ListStatus } from "../../shared/list";
import type {
	AnilistMediaCard,
	AnilistMediaCardCached,
} from "../../lib/schemas/anilist-media-card";
import type { AnimeInsert, ListEntryInsert } from "../db/types";

export const anilistMediaStatusSchema = z.enum([
	"CURRENT",
	"PLANNING",
	"COMPLETED",
	"DROPPED",
	"PAUSED",
	"REPEATING",
]);

export type AnilistMediaStatus = z.infer<typeof anilistMediaStatusSchema>;

const fuzzyDateSchema = z
	.object({
		year: z.number().nullable().optional(),
		month: z.number().nullable().optional(),
		day: z.number().nullable().optional(),
	})
	.nullable()
	.optional();

const titleSchema = z.object({
	romaji: z.string().nullable().optional(),
	english: z.string().nullable().optional(),
	native: z.string().nullable().optional(),
	userPreferred: z.string().nullable().optional(),
});

const studioNodeSchema = z
	.object({
		name: z.string(),
		isAnimationStudio: z.boolean().nullable().optional(),
	})
	.nullable();

export const anilistMediaSchema = z.object({
	id: z.number(),
	idMal: z.number().nullable().optional(),
	description: z.string().nullable().optional(),
	episodes: z.number().nullable().optional(),
	title: titleSchema,
	coverImage: z
		.object({
			extraLarge: z.string().nullable().optional(),
			large: z.string().nullable().optional(),
		})
		.nullable()
		.optional(),
	bannerImage: z.string().nullable().optional(),
	synonyms: z.array(z.string()).nullable().optional(),
	type: z.string().nullable().optional(),
	status: z.string().nullable().optional(),
	season: z.string().nullable().optional(),
	seasonYear: z.number().nullable().optional(),
	studios: z
		.object({
			nodes: z.array(studioNodeSchema).nullable().optional(),
		})
		.nullable()
		.optional(),
	genres: z.array(z.string()).nullable().optional(),
	format: z.string().nullable().optional(),
	meanScore: z.number().nullable().optional(),
	averageScore: z.number().nullable().optional(),
	popularity: z.number().nullable().optional(),
	isAdult: z.boolean().nullable().optional(),
	startDate: fuzzyDateSchema,
	endDate: fuzzyDateSchema,
	trailer: z
		.object({
			id: z.string().nullable().optional(),
			site: z.string().nullable().optional(),
		})
		.nullable()
		.optional(),
	nextAiringEpisode: z
		.object({
			episode: z.number().nullable().optional(),
		})
		.nullable()
		.optional(),
});

export type AnilistMedia = z.infer<typeof anilistMediaSchema>;

export const anilistMediaListSchema = z.object({
	id: z.number(),
	media: anilistMediaSchema.nullable().optional(),
	status: z.string().nullable().optional(),
	score: z.number().nullable().optional(),
	progress: z.number().nullable().optional(),
	repeat: z.number().nullable().optional(),
	notes: z.string().nullable().optional(),
	startedAt: fuzzyDateSchema,
	completedAt: fuzzyDateSchema,
	updatedAt: z.number().nullable().optional(),
});

export type AnilistMediaList = z.infer<typeof anilistMediaListSchema>;

export const viewerSchema = z.object({
	id: z.number(),
	name: z.string(),
});

export const mediaListCollectionSchema = z.object({
	lists: z
		.array(
			z
				.object({
					name: z.string().nullable().optional(),
					status: z.string().nullable().optional(),
					entries: z.array(anilistMediaListSchema.nullable()).nullable().optional(),
				})
				.nullable(),
		)
		.nullable()
		.optional(),
	hasNextChunk: z.boolean().nullable().optional(),
});

export const searchPageSchema = z.object({
	pageInfo: z
		.object({
			currentPage: z.number().nullable().optional(),
			hasNextPage: z.boolean().nullable().optional(),
		})
		.optional(),
	media: z.array(anilistMediaSchema.nullable()).nullable().optional(),
});

export function mapAnilistStatus(status: string | null | undefined): ListStatus {
	switch (status) {
		case "COMPLETED":
			return "Completed";
		case "PAUSED":
			return "On hold";
		case "DROPPED":
			return "Dropped";
		case "PLANNING":
			return "Plan to watch";
		case "CURRENT":
		case "REPEATING":
		default:
			return "Currently watching";
	}
}

export function toAnilistStatus(status: ListStatus, rewatching: boolean): AnilistMediaStatus {
	if (rewatching) {
		return "REPEATING";
	}
	switch (status) {
		case "Completed":
			return "COMPLETED";
		case "On hold":
			return "PAUSED";
		case "Dropped":
			return "DROPPED";
		case "Plan to watch":
			return "PLANNING";
		default:
			return "CURRENT";
	}
}

export function formatFuzzyDate(
	date:
		| {
				year?: number | null;
				month?: number | null;
				day?: number | null;
		  }
		| null
		| undefined,
): string | null {
	if (!date?.year) {
		return null;
	}
	const month = String(date.month ?? 1).padStart(2, "0");
	const day = String(date.day ?? 1).padStart(2, "0");
	return `${date.year}-${month}-${day}`;
}

export function formatSeason(
	season: string | null | undefined,
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

export function mapFormat(format: string | null | undefined): string {
	switch (format) {
		case "MOVIE":
			return "Movie";
		case "OVA":
			return "OVA";
		case "ONA":
			return "ONA";
		default:
			return "TV";
	}
}

export function mapAiringStatus(status: string | null | undefined): string {
	switch (status) {
		case "RELEASING":
			return "Currently airing";
		case "NOT_YET_RELEASED":
			return "Not yet released";
		case "CANCELLED":
			return "Cancelled";
		case "HIATUS":
			return "Hiatus";
		case "FINISHED":
		default:
			return "Finished airing";
	}
}

export function pickTitle(
	title: AnilistMedia["title"],
	language: "Romaji" | "English" | "Native" = "Romaji",
): string {
	if (language === "English") {
		return (
			title.english ||
			title.userPreferred ||
			title.romaji ||
			title.native ||
			"Untitled"
		);
	}
	if (language === "Native") {
		return (
			title.native ||
			title.userPreferred ||
			title.romaji ||
			title.english ||
			"Untitled"
		);
	}
	return (
		title.userPreferred ||
		title.romaji ||
		title.english ||
		title.native ||
		"Untitled"
	);
}

export function pickCoverUrl(media: AnilistMedia): string {
	return media.coverImage?.extraLarge || media.coverImage?.large || "";
}

export function pickBannerUrl(media: AnilistMedia): string {
	return media.bannerImage ?? "";
}

export function toFuzzyDateInput(
	iso: string | null | undefined,
): { year: number; month: number; day: number } | undefined {
	if (!iso) {
		return undefined;
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!match) {
		return undefined;
	}
	return {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
	};
}

export function stripHtml(value: string | null | undefined): string {
	if (!value) {
		return "";
	}
	return value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
}

function lastAiredEpisode(media: AnilistMedia): number {
	const next = media.nextAiringEpisode?.episode;
	if (next != null && next > 0) {
		return Math.max(0, next - 1);
	}
	const status = media.status?.toUpperCase() ?? "";
	if (status === "FINISHED" || status === "CANCELLED") {
		return media.episodes ?? 0;
	}
	return 0;
}

export function toAnimeRow(
	media: AnilistMedia,
	titleLanguage: "Romaji" | "English" | "Native" = "Romaji",
): AnimeInsert {
	const preferred = pickTitle(media.title, titleLanguage);
	const titles = [
		media.title.romaji,
		media.title.english,
		media.title.native,
		...(media.synonyms ?? []),
	].filter((item): item is string => Boolean(item));
	const uniqueTitles = [...new Set(titles)].filter((item) => item !== preferred);
	const studios = (media.studios?.nodes ?? [])
		.filter((node): node is NonNullable<typeof node> => Boolean(node))
		.filter((node) => node.isAnimationStudio !== false)
		.map((node) => node.name);

	return {
		id: media.id,
		title: preferred,
		alternativeTitles: uniqueTitles.join(", "),
		type: mapFormat(media.format),
		episodes: media.episodes ?? 0,
		averageScore: media.averageScore ?? media.meanScore ?? 0,
		season: formatSeason(media.season, media.seasonYear),
		airingStatus: mapAiringStatus(media.status),
		genres: JSON.stringify(media.genres ?? []),
		producers: JSON.stringify(studios),
		synopsis: stripHtml(media.description),
		folder: "",
		fansub: "",
		lastAiredEpisode: lastAiredEpisode(media),
		coverUrl: pickCoverUrl(media),
		bannerUrl: pickBannerUrl(media),
	};
}

export function toListEntryRow(
	animeId: number,
	entry: AnilistMediaList,
): ListEntryInsert {
	const started = formatFuzzyDate(entry.startedAt);
	const completed = formatFuzzyDate(entry.completedAt);
	const updated =
		entry.updatedAt != null
			? new Date(entry.updatedAt * 1000).toISOString()
			: new Date().toISOString();

	return {
		animeId,
		status: mapAnilistStatus(entry.status),
		episodesWatched: entry.progress ?? 0,
		score: entry.score && entry.score > 0 ? Math.round(entry.score) : null,
		started,
		completed,
		lastUpdated: updated,
		timesRewatched: entry.repeat ?? 0,
		rewatching: entry.status === "REPEATING" ? 1 : 0,
		notes: entry.notes ?? "",
		dateStarted: started,
		dateCompleted: completed,
		anilistListId: entry.id,
	};
}

function pickTrailerId(media: AnilistMedia): string | null {
	return media.trailer?.site?.toLowerCase() === "youtube" || !media.trailer?.site
		? (media.trailer?.id ?? null)
		: null;
}

function pickProducers(media: AnilistMedia): string[] {
	return (media.studios?.nodes ?? [])
		.filter((node): node is NonNullable<typeof node> => Boolean(node))
		.map((node) => node.name);
}

export function toMediaCardCached(media: AnilistMedia): AnilistMediaCardCached {
	return {
		id: media.id,
		titles: {
			romaji: media.title.romaji ?? "",
			english: media.title.english ?? "",
			native: media.title.native ?? "",
		},
		coverUrl: pickCoverUrl(media),
		bannerUrl: pickBannerUrl(media),
		episodes: media.episodes ?? 0,
		format: mapFormat(media.format),
		status: mapAiringStatus(media.status),
		season: media.season ?? "",
		seasonYear: media.seasonYear ?? null,
		averageScore: media.averageScore ?? media.meanScore ?? 0,
		popularity: media.popularity ?? 0,
		genres: media.genres ?? [],
		producers: pickProducers(media),
		synopsis: stripHtml(media.description),
		startDate: formatFuzzyDate(media.startDate),
		endDate: formatFuzzyDate(media.endDate),
		trailerId: pickTrailerId(media),
		isAdult: media.isAdult === true,
	};
}

export function withMediaCardTitle(
	item: AnilistMediaCardCached,
	titleLanguage?: "Romaji" | "English" | "Native",
): AnilistMediaCard {
	return {
		...item,
		title: pickTitle(item.titles, titleLanguage),
	};
}

export function toMediaCard(
	media: AnilistMedia,
	titleLanguage?: "Romaji" | "English" | "Native",
): AnilistMediaCard {
	return withMediaCardTitle(toMediaCardCached(media), titleLanguage);
}
