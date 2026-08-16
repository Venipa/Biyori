import { z } from "zod";

export const listStatusSchema = z.enum([
	"Currently watching",
	"Completed",
	"On hold",
	"Dropped",
	"Plan to watch",
]);

export type ListStatus = z.infer<typeof listStatusSchema>;

export const animeTypeSchema = z.enum(["TV", "ONA", "Movie", "OVA"]);
