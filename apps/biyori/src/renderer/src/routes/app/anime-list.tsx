import { AnimeListView } from "@/mainview/components/anime-list-view";
import {
	animeInfoSearchSchema,
	parseAnimeInfoId,
} from "@/lib/schemas/anime-info-search";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { listStatusSchema } from "@/shared/list";
import { createFileRoute } from "@tanstack/react-router";

const searchSchema = animeInfoSearchSchema.extend({
	tab: listStatusSchema.optional(),
});

export const Route = createFileRoute("/app/anime-list")({
	validateSearch: searchSchema,
	component: AnimeListPage,
});

function AnimeListPage() {
	const { tab: tabRaw, id } = Route.useSearch();
	const tab = tabRaw ?? "Currently watching";
	const openAnimeId = parseAnimeInfoId(id);
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
