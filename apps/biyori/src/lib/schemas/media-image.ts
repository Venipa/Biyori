import { z } from "zod";

export const mediaImageKindSchema = z.enum(["cover", "banner"]);

export type MediaImageKind = z.infer<typeof mediaImageKindSchema>;
