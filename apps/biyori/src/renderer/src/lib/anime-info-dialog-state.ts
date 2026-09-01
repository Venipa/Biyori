export function isAnimeInfoDialogOpen(id: number | undefined, armed: boolean, ready = false): boolean {
	return id != null && (armed || ready);
}

export function shownAnimeInfoDetail<T extends { id: number }>(
	queryId: number | undefined,
	data: T | null | undefined,
	armed: boolean,
): T | undefined {
	if (queryId != null && data?.id === queryId) {
		return data;
	}
	if (armed && data) {
		return data;
	}
	return undefined;
}

export function dialogPaintedAnime<T>(matching: T | undefined, lastShown: T | undefined, keepPreviousPaint: boolean): T | undefined {
	return matching ?? (keepPreviousPaint ? lastShown : undefined);
}

export function shouldHydrateAnimeInfoUrl(input: {
	urlId: number | undefined;
	storeId: number | undefined;
	ignoreUrlUntilCleared: boolean;
}): boolean {
	return input.urlId != null && input.storeId == null && !input.ignoreUrlUntilCleared;
}

export function isPendingAnimeInfoOpen(id: number | undefined, dialogOpen: boolean): boolean {
	return id != null && !dialogOpen;
}

export function shouldEnsureAnimeInfo(input: {
	id: number | undefined;
	matching: boolean;
	isFetched: boolean;
	isPlaceholderData: boolean;
	ensurePendingForId: boolean;
}): boolean {
	if (input.id == null || input.matching || !input.isFetched || input.isPlaceholderData || input.ensurePendingForId) {
		return false;
	}
	return true;
}

export type AnimeInfoDialogGateInput<T extends { id: number }> = {
	id: number | undefined;
	heldId: number | undefined;
	data: T | null | undefined;
	isFetched: boolean;
	isPlaceholderData: boolean;
	ensurePendingForId: boolean;
	ensureError: string | undefined;
	armed: boolean;
	lastShown: T | undefined;
};

export function selectAnimeInfoDialog<T extends { id: number }>(input: AnimeInfoDialogGateInput<T>): {
	queryId: number | undefined;
	dialogOpen: boolean;
	nextArmed: boolean;
	painted: T | undefined;
	shouldEnsure: boolean;
	pending: boolean;
} {
	const queryId = input.id ?? input.heldId;
	const matching = queryId != null && input.data?.id === queryId ? input.data : undefined;
	const ready = Boolean(matching) || Boolean(input.ensureError);
	const nextArmed = input.id == null ? false : input.armed || ready;
	const dialogOpen = isAnimeInfoDialogOpen(input.id, nextArmed);
	const keepPreviousPaint = !input.ensureError && (dialogOpen || input.heldId != null);
	const painted = dialogPaintedAnime(shownAnimeInfoDetail(queryId, input.data, dialogOpen), input.lastShown, keepPreviousPaint);
	return {
		queryId,
		dialogOpen,
		nextArmed,
		painted,
		shouldEnsure: shouldEnsureAnimeInfo({
			id: input.id,
			matching: Boolean(matching),
			isFetched: input.isFetched,
			isPlaceholderData: input.isPlaceholderData,
			ensurePendingForId: input.ensurePendingForId,
		}),
		pending: isPendingAnimeInfoOpen(input.id, dialogOpen),
	};
}
