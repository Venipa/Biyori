import type { trpc } from "@/mainview/trpc";

export type AnimeCacheEvent = "added" | "entrySaved" | "removed" | "watched" | "synced";

type TrpcUtils = ReturnType<typeof trpc.useUtils>;

export function invalidateAnimeQueries(utils: TrpcUtils, event: AnimeCacheEvent, id?: number): Promise<void> {
	const tasks: Promise<unknown>[] = [utils.anime.list.invalidate(), utils.anime.counts.invalidate()];

	if (event === "added" || event === "entrySaved" || event === "removed") {
		tasks.push(utils.anime.listed.invalidate());
		tasks.push(utils.statistics.summary.invalidate());
	}

	if (event === "watched" || event === "synced") {
		tasks.push(utils.history.list.invalidate());
		tasks.push(utils.history.queuedCount.invalidate());
		tasks.push(utils.statistics.summary.invalidate());
	}

	if (id != null && (event === "added" || event === "entrySaved" || event === "watched")) {
		tasks.push(utils.anime.byId.invalidate({ id }));
	}

	return Promise.all(tasks).then(() => undefined);
}
