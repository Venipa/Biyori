import { z } from "zod";

const folderRuleBase = z.object({
	path: z.string().min(1),
	/** null = any season; 0 = specials (S00) */
	season: z.number().int().min(0).nullable(),
	from: z.number().int().min(0),
	to: z.number().int().min(0).nullable(),
	animeId: z.number().int().positive(),
	offset: z.number().int(),
});

/** Routes episodes of one series folder to another anime, e.g. a split cour or S00 specials. */
export const folderRuleSchema = folderRuleBase.extend({ id: z.string().min(1), title: z.string() });

export const folderRuleInputSchema = folderRuleBase.refine((rule) => rule.to == null || rule.to >= rule.from, { message: "library.rule.invalidRange", path: ["to"] });

export type FolderRuleInput = z.infer<typeof folderRuleInputSchema>;
export type FolderRule = z.infer<typeof folderRuleSchema>;
