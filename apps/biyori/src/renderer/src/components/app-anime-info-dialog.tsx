import { parseAnimeInfoId } from "@/lib/schemas/anime-info-search";
import { AnimeInfoDialog } from "@/mainview/components/anime-info-dialog";
import {
	useAnimeInfoNav,
	useAnimeInfoOpen,
} from "@/mainview/lib/anime-info-nav";
import { trpc } from "@/mainview/trpc";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export function AppAnimeInfoDialog() {
	const nav = useAnimeInfoNav();
	const fromStore = useAnimeInfoOpen();
	const utils = trpc.useUtils();
	const fromUrlId = useRouterState({
		select: (state) => parseAnimeInfoId(state.location.search.id),
	});
	const fromUrlTab = useRouterState({
		select: (state) => {
			const tab = state.location.search.infoTab;
			return tab === "main" || tab === "list" ? tab : undefined;
		},
	});
	const id = fromStore?.id ?? fromUrlId;
	const infoTab = fromStore?.infoTab ?? fromUrlTab;
	const openedAt = useRef(0);
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
		openedAt.current = Date.now();
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
					if (Date.now() - openedAt.current < 400) {
						return;
					}
					nav.close();
				}
			}}
		/>
	);
}
