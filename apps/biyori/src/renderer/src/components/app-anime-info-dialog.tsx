import { parseAnimeInfoId } from "@/lib/schemas/anime-info-search";
import { AnimeInfoDialog } from "@/mainview/components/anime-info-dialog";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { trpc } from "@/mainview/trpc";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export function AppAnimeInfoDialog() {
	const nav = useAnimeInfoNav();
	const utils = trpc.useUtils();
	const id = useRouterState({
		select: (state) => parseAnimeInfoId(state.location.search.id),
	});
	const infoTab = useRouterState({
		select: (state) => {
			const tab = state.location.search.infoTab;
			return tab === "main" || tab === "list" ? tab : undefined;
		},
	});
	const ensureAnime = trpc.anime.ensure.useMutation({
		onSuccess: (detail) => {
			utils.anime.byId.setData({ id: detail.id }, detail);
		},
	});
	const ensureRef = useRef(ensureAnime);
	ensureRef.current = ensureAnime;
	const ensureForThisId = ensureAnime.variables?.id === id;

	useEffect(() => {
		if (id == null) {
			ensureRef.current.reset();
			return;
		}
		void ensureRef.current.mutateAsync({ id });
	}, [id]);

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
			infoTab={infoTab}
			onNavigate={nav.navigateTo}
			onOpenChange={(open) => {
				if (!open) {
					nav.close();
				}
			}}
		/>
	);
}
