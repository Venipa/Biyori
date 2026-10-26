import { createFileRoute } from "@tanstack/react-router";
import { anilistSearchRouteSchema } from "@/lib/schemas/anilist-search";
import { SearchPage } from "@/mainview/components/app/search/page";

export const Route = createFileRoute("/app/search")({
	validateSearch: anilistSearchRouteSchema,
	loaderDeps: ({ search }) => ({ q: search.q }),
	loader: ({ context, deps }) => {
		void context.utils.anime.listed.prefetch();
		if (deps.q?.trim()) {
			void context.utils.anilist.search.prefetch({ q: deps.q, page: 1 });
		}
	},
	component: SearchPage,
});
