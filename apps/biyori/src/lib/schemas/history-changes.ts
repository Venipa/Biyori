import { z } from "zod";
import { listStatusSchema } from "../../shared/list";

/** What one list update changed. Values are the new state; flags mark changes without a short display value. */
export const historyChangesSchema = z.object({
	episode: z.number().int().optional(),
	status: listStatusSchema.optional(),
	score: z.number().nullable().optional(),
	notes: z.literal(true).optional(),
	rewatch: z.literal(true).optional(),
	dates: z.literal(true).optional(),
});

export type HistoryChanges = z.infer<typeof historyChangesSchema>;

export function parseHistoryChanges(raw: string | null | undefined): HistoryChanges {
	try {
		const parsed = historyChangesSchema.safeParse(JSON.parse(raw ?? "{}"));
		return parsed.success ? parsed.data : {};
	} catch {
		return {};
	}
}
