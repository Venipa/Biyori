import { createFileRoute } from "@tanstack/react-router";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { LibraryRootPage } from "@/mainview/components/app/library/page";

export const Route = createFileRoute("/app/library_/$root")({
	validateSearch: animeInfoSearchSchema,
	loader: ({ context, params }) => {
		void context.utils.library.folders.prefetch({ root: params.root });
		void context.utils.anime.listed.prefetch();
	},
	component: LibraryRootPage,
});
