import { AnimeInfoDialog } from "@/mainview/components/anime-info-dialog";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { trpc } from "@/mainview/trpc";
import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

export function AppAnimeInfoDialog() {
	const nav = useAnimeInfoNav();
	const utils = trpc.useUtils();
	const search = useRouterState({
		select: (state) => {
			const parsed = animeInfoSearchSchema.safeParse(state.location.search);
			return parsed.success
				? parsed.data
				: { id: undefined, infoTab: undefined };
		},
	});
	const ensureAnime = trpc.anime.ensure.useMutation({
		onSuccess: (detail) => {
			utils.anime.byId.setData({ id: detail.id }, detail);
		},
	});
	const id = search.id;
	const ensureMutate = ensureAnime.mutateAsync;
	const ensureReset = ensureAnime.reset;
	const ensureForThisId = ensureAnime.variables?.id === id;

	useEffect(() => {
		if (id == null) {
			ensureReset();
			return;
		}
		void ensureMutate({ id });
	}, [id, ensureMutate, ensureReset]);

	return (
		<AnimeInfoDialog
			id={id}
			ensuring={
				id != null &&
				!ensureAnime.isError &&
				(ensureAnime.isPending || !ensureForThisId)
			}
			ensureError={
				id != null && ensureAnime.isError && ensureForThisId
					? (ensureAnime.error.message ?? "Could not load anime")
					: undefined
			}
			infoTab={search.infoTab}
			onNavigate={nav.navigateTo}
			onOpenChange={(open) => {
				if (!open) {
					nav.close();
				}
			}}
		/>
	);
}
