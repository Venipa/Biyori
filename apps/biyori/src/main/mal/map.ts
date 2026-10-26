import { z } from "zod";
import { stringifyMediaTitles } from "../../lib/anime-titles";
import type { AnilistMediaCardCached } from "../../lib/schemas/anilist-media-card";
import type { TitleLanguage } from "../../lib/schemas/app-settings";
import type { RelatedMedia } from "../../lib/schemas/related-media";
import type { ListStatus } from "../../shared/list";
import { pickTitle } from "../anilist/map";
import type { AnimeInsert, ListEntryInsert } from "../db/types";

export const malListStatusSchema = z.object({
	status: z.enum(["watching", "completed", "on_hold", "dropped", "plan_to_watch"]).nullable().optional(),
	score: z.number().nullable().optional(),
	num_episodes_watched: z.number().nullable().optional(),
	is_rewatching: z.boolean().nullable().optional(),
	start_date: z.string().nullable().optional(),
	finish_date: z.string().nullable().optional(),
	num_times_rewatched: z.number().nullable().optional(),
	comments: z.string().nullable().optional(),
	updated_at: z.string().nullable().optional(),
});

export type MalListStatus = z.infer<typeof malListStatusSchema>;

export const malListPageSchema = z.object({
	data: z.array(z.object({ node: z.lazy(() => malAnimeNodeSchema), list_status: malListStatusSchema })),
	paging: z.object({ next: z.string().optional() }).optional(),
});

export const malUserSchema = z.object({
	id: z.number(),
	name: z.string(),
	picture: z.string().optional(),
});

export function mapMalStatus(status: MalListStatus["status"]): ListStatus {
	switch (status) {
		case "completed":
			return "Completed";
		case "on_hold":
			return "On hold";
		case "dropped":
			return "Dropped";
		case "plan_to_watch":
			return "Plan to watch";
		default:
			return "Currently watching";
	}
}

export function toMalStatus(status: ListStatus): NonNullable<MalListStatus["status"]> {
	switch (status) {
		case "Completed":
			return "completed";
		case "On hold":
			return "on_hold";
		case "Dropped":
			return "dropped";
		case "Plan to watch":
			return "plan_to_watch";
		default:
			return "watching";
	}
}

/** MAL dates may be partial ("2024" / "2024-03"); keep only full days. */
function fullDate(value: string | null | undefined): string | null {
	return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function malListEntryRow(animeId: number, entry: MalListStatus): ListEntryInsert & { animeId: number } {
	const started = fullDate(entry.start_date);
	const completed = fullDate(entry.finish_date);
	return {
		animeId,
		status: mapMalStatus(entry.status),
		episodesWatched: entry.num_episodes_watched ?? 0,
		// stored on the app-wide 0-100 scale; MAL scores are 0-10
		score: entry.score && entry.score > 0 ? Math.round(entry.score * 10) : null,
		started,
		completed,
		lastUpdated: entry.updated_at ? new Date(entry.updated_at).toISOString() : new Date().toISOString(),
		timesRewatched: entry.num_times_rewatched ?? 0,
		rewatching: entry.is_rewatching ? 1 : 0,
		notes: entry.comments ?? "",
		dateStarted: started,
		dateCompleted: completed,
		remoteEntryId: null,
	};
}

const malPictureSchema = z.object({ medium: z.string().optional(), large: z.string().optional() }).nullable().optional();

const malRelatedSchema = z.object({
	node: z.object({ id: z.number(), title: z.string(), main_picture: malPictureSchema }),
	relation_type: z.string(),
});

export const malAnimeNodeSchema = z.object({
	id: z.number(),
	title: z.string(),
	main_picture: malPictureSchema,
	alternative_titles: z
		.object({ synonyms: z.array(z.string()).optional(), en: z.string().optional(), ja: z.string().optional() })
		.nullable()
		.optional(),
	start_date: z.string().nullable().optional(),
	end_date: z.string().nullable().optional(),
	synopsis: z.string().nullable().optional(),
	mean: z.number().nullable().optional(),
	rank: z.number().nullable().optional(),
	popularity: z.number().nullable().optional(),
	num_list_users: z.number().nullable().optional(),
	nsfw: z.string().nullable().optional(),
	media_type: z.string().nullable().optional(),
	status: z.string().nullable().optional(),
	genres: z
		.array(z.object({ name: z.string() }))
		.nullable()
		.optional(),
	num_episodes: z.number().nullable().optional(),
	start_season: z.object({ year: z.number(), season: z.string() }).nullable().optional(),
	broadcast: z.object({ day_of_the_week: z.string(), start_time: z.string().optional() }).nullable().optional(),
	average_episode_duration: z.number().nullable().optional(),
	studios: z
		.array(z.object({ name: z.string() }))
		.nullable()
		.optional(),
	related_anime: z.array(malRelatedSchema).nullable().optional(),
});

export type MalAnimeNode = z.infer<typeof malAnimeNodeSchema>;

/** Every field the unified anime row and discover cards use. */
export const MAL_ANIME_FIELDS =
	"id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,nsfw,media_type,status,genres,num_episodes,start_season,broadcast,average_episode_duration,studios";

function mapMalFormat(mediaType: string | null | undefined): string {
	switch (mediaType) {
		case "movie":
			return "Movie";
		case "ova":
			return "OVA";
		case "ona":
			return "ONA";
		case "special":
		case "tv_special":
			return "Special";
		case "music":
			return "Music";
		default:
			return "TV";
	}
}

function mapMalAiringStatus(status: string | null | undefined): string {
	switch (status) {
		case "currently_airing":
			return "Currently airing";
		case "not_yet_aired":
			return "Not yet released";
		default:
			return "Finished airing";
	}
}

function malSeason(node: MalAnimeNode): string {
	const season = node.start_season;
	return season ? `${season.season.charAt(0).toUpperCase()}${season.season.slice(1)} ${season.year}` : "";
}

function malBroadcast(node: MalAnimeNode): string | null {
	const slot = node.broadcast;
	if (!slot) {
		return null;
	}
	const day = slot.day_of_the_week.charAt(0).toUpperCase() + slot.day_of_the_week.slice(1);
	return slot.start_time ? `${day} ${slot.start_time} JST` : day;
}

function malTitles(node: MalAnimeNode) {
	return { romaji: node.title, english: node.alternative_titles?.en ?? "", native: node.alternative_titles?.ja ?? "" };
}

export function toMalAnimeRow(node: MalAnimeNode, titleLanguage: TitleLanguage): AnimeInsert & { id: number } {
	const titles = malTitles(node);
	return {
		id: node.id,
		title: pickTitle(titles, titleLanguage),
		titles: stringifyMediaTitles(titles, node.alternative_titles?.synonyms ?? []),
		type: mapMalFormat(node.media_type),
		episodes: node.num_episodes ?? 0,
		durationMinutes: Math.round((node.average_episode_duration ?? 0) / 60),
		averageScore: Math.round((node.mean ?? 0) * 10),
		popularity: node.num_list_users ?? 0,
		ratedRank: node.rank ?? null,
		popularRank: node.popularity ?? null,
		season: malSeason(node),
		airingStatus: mapMalAiringStatus(node.status),
		genres: JSON.stringify((node.genres ?? []).map((genre) => genre.name)),
		tags: "[]",
		producers: JSON.stringify((node.studios ?? []).map((studio) => studio.name)),
		synopsis: node.synopsis ?? "",
		nextAiringAt: null,
		broadcast: malBroadcast(node),
		startDate: node.start_date ?? null,
		endDate: node.end_date ?? null,
		coverUrl: node.main_picture?.large ?? node.main_picture?.medium ?? "",
		bannerUrl: "",
	};
}

export function toMalCard(node: MalAnimeNode): AnilistMediaCardCached {
	return {
		id: node.id,
		titles: malTitles(node),
		coverUrl: node.main_picture?.large ?? node.main_picture?.medium ?? "",
		bannerUrl: "",
		episodes: node.num_episodes ?? 0,
		format: mapMalFormat(node.media_type),
		status: mapMalAiringStatus(node.status),
		season: node.start_season?.season.toUpperCase() ?? "",
		seasonYear: node.start_season?.year ?? null,
		averageScore: Math.round((node.mean ?? 0) * 10),
		popularity: node.num_list_users ?? 0,
		genres: (node.genres ?? []).map((genre) => genre.name),
		tags: [],
		ratedRank: node.rank ?? null,
		popularRank: node.popularity ?? null,
		producers: (node.studios ?? []).map((studio) => studio.name),
		synopsis: node.synopsis ?? "",
		startDate: node.start_date ?? null,
		endDate: node.end_date ?? null,
		trailerId: null,
		isAdult: node.nsfw === "black",
	};
}

export function toMalRelated(node: MalAnimeNode): RelatedMedia[] {
	return (node.related_anime ?? []).map((item) => ({
		id: item.node.id,
		mediaType: "ANIME" as const,
		relationType: item.relation_type.toUpperCase(),
		title: item.node.title,
		coverUrl: item.node.main_picture?.large ?? item.node.main_picture?.medium ?? "",
		format: "",
		episodes: 0,
		chapters: null,
	}));
}
