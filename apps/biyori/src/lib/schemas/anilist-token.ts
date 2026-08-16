import { z } from "zod";

export const anilistTokenSchema = z.object({
	token: z.preprocess(
		(value) => (typeof value === "string" ? value : ""),
		z.string().trim().min(1, "Required"),
	),
});

export type AnilistTokenInput = z.input<typeof anilistTokenSchema>;
export type AnilistToken = z.output<typeof anilistTokenSchema>;
