import { z } from "zod";
import { anilistMediaTitlesSchema } from "./schemas/anilist-media-card";

export const storedAnimeTitlesSchema = anilistMediaTitlesSchema.extend({
	synonyms: z.array(z.string()).default([]),
});

export type StoredAnimeTitles = z.infer<typeof storedAnimeTitlesSchema>;

export const emptyStoredTitles: StoredAnimeTitles = {
	romaji: "",
	english: "",
	native: "",
	synonyms: [],
};

export function parseStoredTitles(value: string | null | undefined): StoredAnimeTitles | null {
	if (!value) {
		return null;
	}
	try {
		const parsed = storedAnimeTitlesSchema.safeParse(JSON.parse(value) as unknown);
		if (!parsed.success) {
			return null;
		}
		if (!parsed.data.romaji && !parsed.data.english && !parsed.data.native && parsed.data.synonyms.length === 0) {
			return null;
		}
		return parsed.data;
	} catch {
		return null;
	}
}

export function stringifyMediaTitles(
	title: {
		romaji?: string | null;
		english?: string | null;
		native?: string | null;
	},
	synonyms?: string[] | null,
): string {
	return JSON.stringify({
		romaji: title.romaji ?? "",
		english: title.english ?? "",
		native: title.native ?? "",
		synonyms: (synonyms ?? []).filter((item) => Boolean(item)),
	} satisfies StoredAnimeTitles);
}

export function titleStrings(titles: StoredAnimeTitles | null | undefined): string[] {
	if (!titles) {
		return [];
	}
	return [titles.romaji, titles.english, titles.native, ...titles.synonyms].map((item) => item.trim()).filter(Boolean);
}

export function titlesFromFallback(title: string): StoredAnimeTitles {
	return {
		...emptyStoredTitles,
		romaji: title,
	};
}
