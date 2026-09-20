import { z } from "zod";
import { parseStoredTitles, stringifyMediaTitles } from "../../lib/anime-titles";
import type { AnilistMediaCard, AnilistMediaCardCached } from "../../lib/schemas/anilist-media-card";
import type { TitleLanguage } from "../../lib/schemas/app-settings";
import type { RelatedMedia } from "../../lib/schemas/related-media";
import type { ListStatus } from "../../shared/list";
import type { AnimeInsert, ListEntryInsert } from "../db/types";

export const anilistMediaStatusSchema = z.enum(["CURRENT", "PLANNING", "COMPLETED", "DROPPED", "PAUSED", "REPEATING"]);

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
	duration: z.number().nullable().optional(),
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
	tags: z
		.array(
			z
				.object({
					name: z.string(),
					rank: z.number().nullable().optional(),
					isMediaSpoiler: z.boolean().nullable().optional(),
				})
				.nullable(),
		)
		.nullable()
		.optional(),
	rankings: z
		.array(
			z
				.object({
					rank: z.number().nullable().optional(),
					type: z.string().nullable().optional(),
					allTime: z.boolean().nullable().optional(),
				})
				.nullable(),
		)
		.nullable()
		.optional(),
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
			airingAt: z.number().nullable().optional(),
		})
		.nullable()
		.optional(),
	relations: z
		.object({
			edges: z
				.array(
					z
						.object({
							relationType: z.string().nullable().optional(),
							node: z
								.object({
									id: z.number(),
									type: z.string().nullable().optional(),
									format: z.string().nullable().optional(),
									title: titleSchema,
									coverImage: z
										.object({
											extraLarge: z.string().nullable().optional(),
											large: z.string().nullable().optional(),
										})
										.nullable()
										.optional(),
									episodes: z.number().nullable().optional(),
									chapters: z.number().nullable().optional(),
									status: z.string().nullable().optional(),
								})
								.nullable()
								.optional(),
						})
						.nullable(),
				)
				.nullable()
				.optional(),
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
	avatar: z
		.object({
			large: z.string().nullable().optional(),
		})
		.nullable()
		.optional(),
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

export function formatSeason(season: string | null | undefined, year: number | null | undefined): string {
	if (!season && !year) {
		return "";
	}
	const label = season ? `${season.charAt(0)}${season.slice(1).toLowerCase()}` : "";
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
		case "SPECIAL":
			return "Special";
		case "TV_SHORT":
			return "TV short";
		case "MANGA":
			return "Manga";
		case "NOVEL":
			return "Novel";
		case "ONE_SHOT":
			return "One shot";
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
		default:
			return "Finished airing";
	}
}

export function pickTitle(
	title: {
		romaji?: string | null;
		english?: string | null;
		native?: string | null;
		userPreferred?: string | null;
	},
	language: TitleLanguage = "Romaji",
): string {
	const romaji = title.romaji || "";
	const english = title.english || "";
	const native = title.native || "";
	const fallback = title.userPreferred || romaji || english || native || "Untitled";
	if (language === "English") {
		return english || fallback;
	}
	if (language === "Native") {
		return native || fallback;
	}
	return romaji || fallback;
}

export { parseStoredTitles, stringifyMediaTitles } from "../../lib/anime-titles";

export function displayTitleFromRow(title: string, titlesJson: string | null | undefined, language: TitleLanguage): string {
	const parsed = parseStoredTitles(titlesJson);
	return parsed ? pickTitle(parsed, language) : title;
}

export function pickCoverUrl(media: AnilistMedia): string {
	return media.coverImage?.extraLarge || media.coverImage?.large || "";
}

export function pickBannerUrl(media: AnilistMedia): string {
	return media.bannerImage ?? "";
}

export function toFuzzyDateInput(iso: string | null | undefined): { year: number; month: number; day: number } | undefined {
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
	return value
		.replace(/<[^>]+>/g, "")
		.replace(/&amp;/g, "&")
		.trim();
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

const TAG_RANK_MIN = 60;

function mediaTagNames(media: AnilistMedia): string[] {
	const names: string[] = [];
	for (const tag of media.tags ?? []) {
		if (!tag || tag.isMediaSpoiler) {
			continue;
		}
		// ponytail: skip low-relevance tags (AniList UI cutoff); store all names if filters miss niche tags
		if (tag.rank != null && tag.rank < TAG_RANK_MIN) {
			continue;
		}
		if (tag.name) {
			names.push(tag.name);
		}
	}
	return names;
}

function allTimeRank(media: AnilistMedia, type: "RATED" | "POPULAR"): number | null {
	for (const ranking of media.rankings ?? []) {
		if (ranking?.allTime !== true || ranking.type !== type) {
			continue;
		}
		if (ranking.rank != null && ranking.rank > 0) {
			return ranking.rank;
		}
	}
	return null;
}

function nextAiringAtIso(airingAt: number | null | undefined): string | null {
	if (airingAt == null || airingAt <= 0) {
		return null;
	}
	return new Date(airingAt * 1000).toISOString();
}

export type AnimeMappedRow = AnimeInsert & {
	id: number;
	lastAiredEpisode: number;
	nextAiringAt: string | null;
	endDate: string | null;
};

export function toAnimeRow(media: AnilistMedia, titleLanguage: TitleLanguage = "Romaji"): AnimeMappedRow {
	const preferred = pickTitle(media.title, titleLanguage);
	const studios = (media.studios?.nodes ?? [])
		.filter((node): node is NonNullable<typeof node> => Boolean(node))
		.filter((node) => node.isAnimationStudio !== false)
		.map((node) => node.name);

	return {
		id: media.id,
		title: preferred,
		titles: stringifyMediaTitles(media.title, media.synonyms),
		type: mapFormat(media.format),
		episodes: media.episodes ?? 0,
		durationMinutes: media.duration ?? 0,
		averageScore: media.averageScore ?? media.meanScore ?? 0,
		popularity: media.popularity ?? 0,
		ratedRank: allTimeRank(media, "RATED"),
		popularRank: allTimeRank(media, "POPULAR"),
		season: formatSeason(media.season, media.seasonYear),
		airingStatus: mapAiringStatus(media.status),
		genres: JSON.stringify(media.genres ?? []),
		tags: JSON.stringify(mediaTagNames(media)),
		producers: JSON.stringify(studios),
		synopsis: stripHtml(media.description),
		folder: "",
		fansub: "",
		lastAiredEpisode: lastAiredEpisode(media),
		nextAiringAt: nextAiringAtIso(media.nextAiringEpisode?.airingAt),
		endDate: formatFuzzyDate(media.endDate),
		coverUrl: pickCoverUrl(media),
		bannerUrl: pickBannerUrl(media),
	};
}

export function toRelatedMedia(media: AnilistMedia, titleLanguage: TitleLanguage = "Romaji"): RelatedMedia[] {
	const items: RelatedMedia[] = [];
	for (const edge of media.relations?.edges ?? []) {
		const node = edge?.node;
		const relationType = edge?.relationType?.trim() ?? "";
		if (!node || relationType === "CHARACTER") {
			continue;
		}
		const mediaType = node.type === "MANGA" ? "MANGA" : "ANIME";
		items.push({
			id: node.id,
			mediaType,
			relationType: relationType || "OTHER",
			title: pickTitle(node.title, titleLanguage),
			coverUrl: node.coverImage?.extraLarge || node.coverImage?.large || "",
			format: mapFormat(node.format),
			episodes: node.episodes ?? 0,
			chapters: node.chapters ?? null,
		});
	}
	return items;
}

export function toListEntryRow(animeId: number, entry: AnilistMediaList): ListEntryInsert {
	const started = formatFuzzyDate(entry.startedAt);
	const completed = formatFuzzyDate(entry.completedAt);
	const updated = entry.updatedAt != null ? new Date(entry.updatedAt * 1000).toISOString() : new Date().toISOString();

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
	return media.trailer?.site?.toLowerCase() === "youtube" || !media.trailer?.site ? (media.trailer?.id ?? null) : null;
}

function pickProducers(media: AnilistMedia): string[] {
	return (media.studios?.nodes ?? []).filter((node): node is NonNullable<typeof node> => Boolean(node)).map((node) => node.name);
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
		tags: mediaTagNames(media),
		ratedRank: allTimeRank(media, "RATED"),
		popularRank: allTimeRank(media, "POPULAR"),
		producers: pickProducers(media),
		synopsis: stripHtml(media.description),
		startDate: formatFuzzyDate(media.startDate),
		endDate: formatFuzzyDate(media.endDate),
		trailerId: pickTrailerId(media),
		isAdult: media.isAdult === true,
	};
}

export function withMediaCardTitle(item: AnilistMediaCardCached, titleLanguage?: TitleLanguage): AnilistMediaCard {
	return {
		...item,
		title: pickTitle(item.titles, titleLanguage),
	};
}

export function toMediaCard(media: AnilistMedia, titleLanguage?: TitleLanguage): AnilistMediaCard {
	return withMediaCardTitle(toMediaCardCached(media), titleLanguage);
}
