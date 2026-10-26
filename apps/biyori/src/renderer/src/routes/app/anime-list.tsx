import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { animeInfoSearchSchema, parseAnimeInfoId } from "@/lib/schemas/anime-info-search";
import { AnimeListView, listStatusFallback } from "@/mainview/components/anime-list-view";
import { useAnimeInfoNav, useAnimeInfoOpen } from "@/mainview/lib/anime-info-nav";
import { animeListTabSchema } from "@/shared/list";

const searchSchema = animeInfoSearchSchema.extend({
	tab: animeListTabSchema.optional(),
	// quick filters, comma-separated ("airing,next"); plain string like the other search params
	quick: z.string().optional(),
});

export const Route = createFileRoute("/app/anime-list")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ tab: search.tab ?? "Currently watching" }),
	// prefetch only (no await) so navigation never waits on IPC
	loader: ({ context, deps }) => {
		void context.utils.anime.list.prefetch({ status: listStatusFallback(deps.tab) });
		void context.utils.settings.get.prefetch();
	},
	component: AnimeListPage,
});

function AnimeListPage() {
	const { tab: tabRaw, id } = Route.useSearch();
	const tab = tabRaw ?? "Currently watching";
	const openAnimeId = useAnimeInfoOpen()?.id ?? parseAnimeInfoId(id);
	const navigate = Route.useNavigate();
	const animeInfo = useAnimeInfoNav();

	return (
		<AnimeListView
			tab={tab}
			openAnimeId={openAnimeId}
			onTabChange={(nextTab) => {
				void navigate({
					search: (prev) => ({
						...prev,
						tab: nextTab,
					}),
				});
			}}
			onOpenAnime={(openId, nextInfoTab) => {
				animeInfo.open({ id: openId, infoTab: nextInfoTab });
			}}
		/>
	);
}
