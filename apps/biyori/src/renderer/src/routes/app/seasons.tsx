import { createFileRoute } from "@tanstack/react-router";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { SeasonsPage } from "@/mainview/components/app/seasons/page";

export const Route = createFileRoute("/app/seasons")({
	validateSearch: animeInfoSearchSchema,
	// season input depends on stored prefs, so only warm the shared lists
	loader: ({ context }) => {
		void context.utils.anime.listed.prefetch();
		void context.utils.settings.get.prefetch();
	},
	component: SeasonsPage,
});
