import { AnimeListView } from "@/mainview/components/anime-list-view";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { listStatusSchema } from "@/shared/list";
import { createFileRoute } from "@tanstack/react-router";

const searchSchema = animeInfoSearchSchema.extend({
	tab: listStatusSchema.default("Currently watching"),
});

export const Route = createFileRoute("/app/anime-list")({
	validateSearch: searchSchema,
	component: AnimeListPage,
});

function AnimeListPage() {
	const { tab, id } = Route.useSearch();
	const navigate = Route.useNavigate();
	const animeInfo = useAnimeInfoNav();

	return (
		<AnimeListView
			tab={tab}
			openAnimeId={id}
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
