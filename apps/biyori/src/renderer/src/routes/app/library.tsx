import { createFileRoute } from "@tanstack/react-router";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { LibraryView } from "@/mainview/components/library-view";

export const Route = createFileRoute("/app/library")({
	validateSearch: animeInfoSearchSchema,
	component: LibraryView,
});
