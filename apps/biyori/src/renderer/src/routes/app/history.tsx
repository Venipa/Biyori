import { createFileRoute } from "@tanstack/react-router";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { HistoryView } from "@/mainview/components/history-view";

export const Route = createFileRoute("/app/history")({
	validateSearch: animeInfoSearchSchema,
	component: HistoryView,
});
