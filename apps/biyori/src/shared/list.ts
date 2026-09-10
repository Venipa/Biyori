import { z } from "zod";

export const listStatusSchema = z.enum(["Currently watching", "Completed", "On hold", "Dropped", "Plan to watch"]);

export type ListStatus = z.infer<typeof listStatusSchema>;

export const LIST_STATUS_SHORT_LABEL: Record<ListStatus, string> = {
	"Currently watching": "Watching",
	Completed: "Completed",
	"On hold": "On Hold",
	Dropped: "Dropped",
	"Plan to watch": "Planned",
};

export function listStatusShortLabel(status: ListStatus): string {
	return LIST_STATUS_SHORT_LABEL[status];
}

export const ANIME_LIST_SEARCH_TAB = "search";

export const animeListTabSchema = z.union([listStatusSchema, z.literal(ANIME_LIST_SEARCH_TAB)]);

export type AnimeListTab = z.infer<typeof animeListTabSchema>;

export const animeTypeSchema = z.enum(["TV", "ONA", "Movie", "OVA"]);
