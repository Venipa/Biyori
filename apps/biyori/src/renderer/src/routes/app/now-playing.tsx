import { createFileRoute } from "@tanstack/react-router";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { NowPlayingPage } from "@/mainview/components/app/now-playing/page";

export const Route = createFileRoute("/app/now-playing")({
	validateSearch: animeInfoSearchSchema,
	component: NowPlayingPage,
});
