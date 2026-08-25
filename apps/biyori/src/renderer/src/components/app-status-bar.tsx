import { useRef } from "react";
import { Spinner } from "@/mainview/components/ui/spinner";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { trpc } from "@/mainview/trpc";

export function AppStatusBar() {
	const utils = trpc.useUtils();
	const lastSuccessAt = useRef<number | null>(null);
	const statusQuery = trpc.anilist.syncStatus.useQuery();
	const noticeQuery = trpc.notice.current.useQuery();
	trpc.anilist.onSyncStatus.useSubscription(undefined, {
		onData: (snapshot) => {
			utils.anilist.syncStatus.setData(undefined, snapshot);
			if (snapshot.lastSuccessAt != null && snapshot.lastSuccessAt !== lastSuccessAt.current) {
				lastSuccessAt.current = snapshot.lastSuccessAt;
				void invalidateAnimeQueries(utils, "synced");
			}
		},
	});
	trpc.notice.onNotice.useSubscription(undefined, {
		onData: (notice) => {
			utils.notice.current.setData(undefined, notice);
		},
	});
	const snapshot = statusQuery.data;
	const running = snapshot?.phase === "running";
	const failed = snapshot?.phase === "error";
	const message = snapshot?.message || noticeQuery.data?.message || "";

	return (
		<div className='flex h-6 shrink-0 items-stretch border-t bg-muted/40 text-[11px] leading-none'>
			<div className='flex min-w-0 flex-1 items-center border-r px-1.5' role='status' aria-live='polite'>
				<p className={failed ? "min-w-0 truncate text-destructive" : "min-w-0 truncate text-muted-foreground"}>{message}</p>
			</div>
			<div className='flex w-7 shrink-0 items-center justify-center'>{running ? <Spinner size='xs' color='foreground' aria-hidden /> : null}</div>
		</div>
	);
}
