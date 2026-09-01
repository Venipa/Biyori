import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { parseAnimeInfoId } from "@/lib/schemas/anime-info-search";
import { AnimeInfoDialog } from "@/mainview/components/anime-info-dialog";
import { selectAnimeInfoDialog, shouldHydrateAnimeInfoUrl } from "@/mainview/lib/anime-info-dialog-state";
import { useAnimeInfoNav, useAnimeInfoOpen } from "@/mainview/lib/anime-info-nav";
import { useHeldOpenPayload } from "@/mainview/lib/held-open-payload";
import { trpc } from "@/mainview/trpc";

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
	const ignoreUrlRef = useRef(false);
	const id = fromStore?.id;
	const infoTab = fromStore?.infoTab ?? fromUrlTab ?? "main";
	const { payload: heldId, onOpenChangeComplete: onIdCloseComplete } = useHeldOpenPayload(id);
	const { payload: heldTab, onOpenChangeComplete: onTabCloseComplete } = useHeldOpenPayload(id == null ? undefined : infoTab);
	const queryId = id ?? heldId;
	const byIdQuery = trpc.anime.byId.useQuery({ id: queryId ?? 0 }, { enabled: queryId != null, staleTime: 30_000 });
	const ensureAnime = trpc.anime.ensure.useMutation({
		onSuccess: (detail) => {
			utils.anime.byId.setData({ id: detail.id }, detail);
		},
	});
	const ensureRef = useRef(ensureAnime);
	ensureRef.current = ensureAnime;
	const stayOpenRef = useRef(false);
	const lastShownRef = useRef<NonNullable<typeof byIdQuery.data> | undefined>(undefined);
	const ensureForThisId = ensureAnime.variables?.id === id;
	const ensureError = id != null && ensureAnime.isError && ensureForThisId ? (ensureAnime.error.message ?? "Could not load anime") : undefined;
	const gate = selectAnimeInfoDialog({
		id,
		heldId,
		data: byIdQuery.data ?? undefined,
		isFetched: byIdQuery.isFetched,
		isPlaceholderData: byIdQuery.isPlaceholderData,
		ensurePendingForId: ensureAnime.isPending && ensureAnime.variables?.id === id,
		ensureError,
		armed: stayOpenRef.current,
		lastShown: lastShownRef.current,
	});
	stayOpenRef.current = gate.nextArmed;
	if (gate.painted) {
		lastShownRef.current = gate.painted;
	}

	const closeDialog = () => {
		ignoreUrlRef.current = true;
		nav.close();
	};

	useEffect(() => {
		if (fromUrlId == null) {
			ignoreUrlRef.current = false;
			return;
		}
		if (
			!shouldHydrateAnimeInfoUrl({
				urlId: fromUrlId,
				storeId: fromStore?.id,
				ignoreUrlUntilCleared: ignoreUrlRef.current,
			})
		) {
			return;
		}
		nav.open({ id: fromUrlId, infoTab: fromUrlTab ?? "main" });
	}, [fromStore?.id, fromUrlId, fromUrlTab, nav]);

	useEffect(() => {
		if (id == null) {
			if (!ensureRef.current.isPending) {
				ensureRef.current.reset();
			}
			return;
		}
		if (!gate.shouldEnsure) {
			return;
		}
		void ensureRef.current.mutateAsync({ id }).catch(() => undefined);
	}, [id, gate.shouldEnsure]);

	useEffect(() => {
		if (!gate.pending) {
			return;
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") {
				return;
			}
			event.preventDefault();
			ignoreUrlRef.current = true;
			nav.close();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [gate.pending, nav]);

	return (
		<AnimeInfoDialog
			open={gate.dialogOpen}
			anime={gate.painted ?? null}
			ensureError={ensureError}
			infoTab={heldTab ?? infoTab}
			onNavigate={nav.navigateTo}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					closeDialog();
				}
			}}
			onOpenChangeComplete={(isOpen) => {
				onIdCloseComplete(isOpen);
				onTabCloseComplete(isOpen);
			}}
		/>
	);
}
