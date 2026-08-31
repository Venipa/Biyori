import { ActivityCenterPanel } from "@/mainview/components/activity-center-panel";
import { Button } from "@/mainview/components/ui/button";
import { Spinner } from "@/mainview/components/ui/spinner";
import { useWatchConfirm } from "@/mainview/components/watch-confirm-actions";
import { setActivityPanelOpen, toggleActivityPanel, useActivityPanelState } from "@/mainview/lib/activity-panel";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { trpc } from "@/mainview/trpc";
import { BellIcon } from "lucide-react";
import { useEffect, useRef } from "react";

export function AppStatusBar() {
	const utils = trpc.useUtils();
	const lastSuccessAt = useRef<number | null>(null);
	const { open, watchConfirmPromoted } = useActivityPanelState();
	const { pending, confirm, skip } = useWatchConfirm();
	const statusQuery = trpc.anilist.syncStatus.useQuery();
	const noticeQuery = trpc.notice.current.useQuery();
	const activityQuery = trpc.activity.snapshot.useQuery();
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
	trpc.activity.onChange.useSubscription(undefined, {
		onData: (snapshot) => {
			utils.activity.snapshot.setData(undefined, snapshot);
		},
	});
	const snapshot = statusQuery.data;
	const notice = noticeQuery.data;
	const live = activityQuery.data?.live ?? [];
	const items = activityQuery.data?.items ?? [];
	const running = snapshot?.phase === "running" || Boolean(notice?.busy) || live.length > 0;
	const failed = snapshot?.phase === "error";
	const message = snapshot?.message || notice?.message || "";
	const showPending = Boolean(pending) && watchConfirmPromoted;

	useEffect(() => {
		if (!open) {
			return;
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") {
				return;
			}
			setActivityPanelOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<div className='relative'>
			<ActivityCenterPanel
				open={open}
				live={live}
				items={items}
				pending={pending}
				showPending={showPending}
				confirmPending={confirm.isPending}
				onClose={() => {
					setActivityPanelOpen(false);
				}}
				onSkip={() => {
					void skip.mutateAsync();
				}}
				onUpdate={() => {
					void confirm.mutateAsync();
				}}
			/>
			<div className='flex h-6 shrink-0 items-stretch border-t bg-muted/40 text-[11px] leading-none'>
				<button
					type='button'
					aria-label={open ? "Close activity center" : "Open activity center"}
					aria-expanded={open}
					className='flex min-w-0 flex-1 cursor-pointer items-center border-r px-1.5 text-left'
					onClick={() => {
						toggleActivityPanel();
					}}>
					<p role='status' aria-live='polite' className={failed ? "min-w-0 truncate text-destructive" : "min-w-0 truncate text-muted-foreground"}>
						{message}
					</p>
				</button>
				<Button
					type='button'
					variant='ghost'
					size='icon-xs'
					aria-label={open ? "Close activity center" : "Open activity center"}
					aria-expanded={open}
					className='size-6 cursor-pointer rounded-none'
					onClick={() => {
						toggleActivityPanel();
					}}>
					<BellIcon />
				</Button>
				<div className='flex w-7 shrink-0 cursor-default items-center justify-center'>{running ? <Spinner size='xs' color={"foreground"} aria-hidden /> : null}</div>
			</div>
		</div>
	);
}
