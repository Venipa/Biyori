import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { HistoryView } from "@/mainview/components/history-view";

export const Route = createFileRoute("/app/history")({
	// types: comma-separated change types, kept a plain string (see animeInfoSearchSchema)
	validateSearch: animeInfoSearchSchema.extend({ types: z.string().optional() }),
	component: HistoryView,
});
