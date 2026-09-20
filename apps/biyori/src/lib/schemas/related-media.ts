import { z } from "zod";

export const relatedMediaTypeSchema = z.enum(["ANIME", "MANGA"]);

export const relatedMediaSchema = z.object({
	id: z.number().int(),
	mediaType: relatedMediaTypeSchema,
	relationType: z.string(),
	title: z.string(),
	coverUrl: z.string(),
	format: z.string(),
	episodes: z.number().int(),
	chapters: z.number().int().nullable(),
});

export type RelatedMedia = z.infer<typeof relatedMediaSchema>;

export function relatedMediaLabel(relationType: string): string {
	return relationType
		.replaceAll("_", " ")
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function relatedHistoryLabel(viaRelation: string | undefined, season: string | undefined): string {
	const relation = viaRelation?.trim();
	if (relation) {
		return relatedMediaLabel(relation);
	}
	return season?.trim() ?? "";
}

export function parseRelatedMedia(value: string | null | undefined): RelatedMedia[] {
	if (!value) {
		return [];
	}
	try {
		const parsed = z.array(relatedMediaSchema).safeParse(JSON.parse(value));
		return parsed.success ? parsed.data : [];
	} catch {
		return [];
	}
}
