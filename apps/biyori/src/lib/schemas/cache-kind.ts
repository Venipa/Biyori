import { z } from "zod";

export const cacheKindSchema = z.enum(["history", "images", "torrents", "torrentHistory"]);

export type CacheKind = z.infer<typeof cacheKindSchema>;

export const cacheKindsSchema = z.array(cacheKindSchema).min(1);
