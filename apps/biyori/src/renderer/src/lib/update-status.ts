import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";

type UpdateState = inferRouterOutputs<AppRouter>["updater"]["status"];

const idle: UpdateState = {
	phase: "idle",
	localVersion: "",
	localChannel: "",
	buildChannel: "",
	localHash: "",
	remoteVersion: null,
	remoteHash: null,
	updateAvailable: false,
	updateReady: false,
	progress: null,
	message: "",
	error: null,
};

export function useUpdateStatus(): UpdateState {
	const query = trpc.updater.status.useQuery(undefined, {
		staleTime: 5_000,
	});
	const utils = trpc.useUtils();
	trpc.updater.onStatus.useSubscription(undefined, {
		onData: (next) => {
			utils.updater.status.setData(undefined, next);
		},
	});
	return query.data ?? idle;
}
