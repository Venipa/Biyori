import { z } from "zod";
import { listStatusSchema } from "../../shared/list";

function emptyToNull(value: unknown): unknown {
	if (value === "" || value === undefined) {
		return null;
	}
	return value;
}

function scoreValue(value: unknown): unknown {
	if (value === undefined) {
		return undefined;
	}
	if (value === "" || value === null) {
		return null;
	}
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n) || n <= 0) {
		return null;
	}
	return Math.trunc(n);
}

export const animeListEntrySchema = z.object({
	status: listStatusSchema,
	progress: z.coerce.number().int().min(0, "Required"),
	notes: z.preprocess(
		(value) => (typeof value === "string" ? value : ""),
		z.string(),
	),
	rewatching: z.boolean(),
	score: z.preprocess(
		scoreValue,
		z.number().int().min(1).max(100).nullable().optional(),
	),
	timesRewatched: z.number().int().min(0).optional(),
	dateStarted: z.string().nullable().optional(),
	dateCompleted: z.string().nullable().optional(),
});

export const animeInfoFormSchema = animeListEntrySchema.extend({
	timesRewatched: z.coerce.number().int().min(0),
	dateStarted: z.preprocess(emptyToNull, z.string().nullable()),
	dateCompleted: z.preprocess(emptyToNull, z.string().nullable()),
	folder: z.string(),
	fansub: z.string(),
	alternativeTitles: z.string(),
});

export type AnimeListEntryInput = z.input<typeof animeListEntrySchema>;
export type AnimeListEntry = z.output<typeof animeListEntrySchema>;
export type AnimeInfoFormInput = z.input<typeof animeInfoFormSchema>;
export type AnimeInfoFormValues = z.output<typeof animeInfoFormSchema>;
