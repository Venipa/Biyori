import { describe, expect, test } from "bun:test";
import { dialogPaintedAnime, isAnimeInfoDialogOpen, isPendingAnimeInfoOpen, selectAnimeInfoDialog, shouldEnsureAnimeInfo, shouldHydrateAnimeInfoUrl, shownAnimeInfoDetail } from "./anime-info-dialog-state";

const a = { id: 1 };
const b = { id: 2 };

describe("anime info dialog load gate", () => {
	test("stays closed until armed with data", () => {
		expect(isAnimeInfoDialogOpen(21000, false)).toBe(false);
		expect(isAnimeInfoDialogOpen(21000, true)).toBe(true);
		expect(isAnimeInfoDialogOpen(21000, false, true)).toBe(true);
		expect(isAnimeInfoDialogOpen(undefined, true)).toBe(false);
	});

	test("keeps matching row after disarm for leave", () => {
		expect(shownAnimeInfoDetail(1, a, false)).toBe(a);
	});

	test("shows previous row while the next id loads", () => {
		expect(shownAnimeInfoDetail(2, a, true)).toBe(a);
		expect(shownAnimeInfoDetail(2, b, true)).toBe(b);
		expect(shownAnimeInfoDetail(2, a, false)).toBe(undefined);
	});

	test("ensures only after a real empty byId", () => {
		expect(
			shouldEnsureAnimeInfo({
				id: 1,
				matching: true,
				isFetched: true,
				isPlaceholderData: false,
				ensurePendingForId: false,
			}),
		).toBe(false);
		expect(
			shouldEnsureAnimeInfo({
				id: 1,
				matching: false,
				isFetched: true,
				isPlaceholderData: true,
				ensurePendingForId: false,
			}),
		).toBe(false);
		expect(
			shouldEnsureAnimeInfo({
				id: 1,
				matching: false,
				isFetched: true,
				isPlaceholderData: false,
				ensurePendingForId: false,
			}),
		).toBe(true);
		expect(
			shouldEnsureAnimeInfo({
				id: 1,
				matching: false,
				isFetched: true,
				isPlaceholderData: false,
				ensurePendingForId: true,
			}),
		).toBe(false);
	});

	test("keeps last painted row while leaving after a new id is requested", () => {
		expect(dialogPaintedAnime(undefined, a, true)).toBe(a);
		expect(dialogPaintedAnime(b, a, true)).toBe(b);
		expect(dialogPaintedAnime(undefined, a, false)).toBe(undefined);
	});

	test("pending open is a requested id with the popup still closed", () => {
		expect(isPendingAnimeInfoOpen(21000, false)).toBe(true);
		expect(isPendingAnimeInfoOpen(21000, true)).toBe(false);
		expect(isPendingAnimeInfoOpen(undefined, false)).toBe(false);
	});
});

describe("anime info dialog sequences", () => {
	test("cached byId opens immediately with that row", () => {
		const next = selectAnimeInfoDialog({
			id: 1,
			heldId: 1,
			data: a,
			isFetched: true,
			isPlaceholderData: false,
			ensurePendingForId: false,
			ensureError: undefined,
			armed: false,
			lastShown: undefined,
		});
		expect(next.dialogOpen).toBe(true);
		expect(next.painted).toBe(a);
		expect(next.shouldEnsure).toBe(false);
		expect(next.pending).toBe(false);
	});

	test("empty cache stays closed and does not paint a loading shell", () => {
		const next = selectAnimeInfoDialog({
			id: 1,
			heldId: 1,
			data: undefined,
			isFetched: false,
			isPlaceholderData: false,
			ensurePendingForId: false,
			ensureError: undefined,
			armed: false,
			lastShown: undefined,
		});
		expect(next.dialogOpen).toBe(false);
		expect(next.painted).toBe(undefined);
		expect(next.pending).toBe(true);
		expect(next.shouldEnsure).toBe(false);
	});

	test("close keeps the row for leave", () => {
		const next = selectAnimeInfoDialog({
			id: undefined,
			heldId: 1,
			data: a,
			isFetched: true,
			isPlaceholderData: false,
			ensurePendingForId: false,
			ensureError: undefined,
			armed: false,
			lastShown: a,
		});
		expect(next.dialogOpen).toBe(false);
		expect(next.painted).toBe(a);
		expect(next.pending).toBe(false);
	});

	test("requesting B during A's leave keeps A's paint until B matches", () => {
		const leaving = selectAnimeInfoDialog({
			id: 2,
			heldId: 2,
			data: a,
			isFetched: true,
			isPlaceholderData: true,
			ensurePendingForId: false,
			ensureError: undefined,
			armed: false,
			lastShown: a,
		});
		expect(leaving.dialogOpen).toBe(false);
		expect(leaving.painted).toBe(a);
		expect(leaving.pending).toBe(true);

		const ready = selectAnimeInfoDialog({
			id: 2,
			heldId: 2,
			data: b,
			isFetched: true,
			isPlaceholderData: false,
			ensurePendingForId: false,
			ensureError: undefined,
			armed: false,
			lastShown: a,
		});
		expect(ready.dialogOpen).toBe(true);
		expect(ready.painted).toBe(b);
	});

	test("fast close before byId never opens", () => {
		const closed = selectAnimeInfoDialog({
			id: undefined,
			heldId: 1,
			data: undefined,
			isFetched: false,
			isPlaceholderData: false,
			ensurePendingForId: true,
			ensureError: undefined,
			armed: false,
			lastShown: undefined,
		});
		expect(closed.dialogOpen).toBe(false);
		expect(closed.painted).toBe(undefined);
		expect(closed.shouldEnsure).toBe(false);
	});

	test("arrow to the next id keeps the previous row while open", () => {
		const next = selectAnimeInfoDialog({
			id: 2,
			heldId: 2,
			data: a,
			isFetched: true,
			isPlaceholderData: true,
			ensurePendingForId: false,
			ensureError: undefined,
			armed: true,
			lastShown: a,
		});
		expect(next.dialogOpen).toBe(true);
		expect(next.painted).toBe(a);
	});

	test("hash id does not reopen after close until the hash is cleared", () => {
		expect(shouldHydrateAnimeInfoUrl({ urlId: 1, storeId: undefined, ignoreUrlUntilCleared: false })).toBe(true);
		expect(shouldHydrateAnimeInfoUrl({ urlId: 1, storeId: 1, ignoreUrlUntilCleared: false })).toBe(false);
		expect(shouldHydrateAnimeInfoUrl({ urlId: 1, storeId: undefined, ignoreUrlUntilCleared: true })).toBe(false);
		expect(shouldHydrateAnimeInfoUrl({ urlId: undefined, storeId: undefined, ignoreUrlUntilCleared: true })).toBe(false);
	});
});
