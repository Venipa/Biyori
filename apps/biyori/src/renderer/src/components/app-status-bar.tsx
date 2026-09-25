import { useEffect, useRef } from "react";
import { ActivityCenterPanel } from "@/mainview/components/activity-center-panel";
import { Spinner } from "@/mainview/components/ui/spinner";
import { useWatchConfirm } from "@/mainview/components/watch-confirm-actions";
import { setActivityPanelOpen, toggleActivityPanel, useActivityPanelState } from "@/mainview/lib/activity-panel";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { trpc } from "@/mainview/trpc";

export function AppStatusBar() {
	const utils = trpc.useUtils();
	const lastSuccessAt = useRef<number | null>(null);
	const listRevision = useRef(0);
	const { open, watchConfirmPromoted } = useActivityPanelState();
	const { pending, confirm, skip } = useWatchConfirm();
	const statusQuery = trpc.anilist.syncStatus.useQuery();
	const noticeQuery = trpc.notice.current.useQuery();
	const activityQuery = trpc.activity.snapshot.useQuery();
	trpc.anilist.onSyncStatus.useSubscription(undefined, {
		onData: (snapshot) => {
			utils.anilist.syncStatus.setData(undefined, snapshot);
			const listChanged = snapshot.listRevision !== listRevision.current && snapshot.listRevision > 0;
			listRevision.current = snapshot.listRevision;
			const successChanged = snapshot.lastSuccessAt != null && snapshot.lastSuccessAt !== lastSuccessAt.current;
			if (successChanged) {
				lastSuccessAt.current = snapshot.lastSuccessAt;
				void invalidateAnimeQueries(utils, "synced");
				void utils.anilist.status.invalidate();
			} else if (listChanged) {
				void invalidateAnimeQueries(utils, "list");
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
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}
			if (target.closest("[data-activity-root], [data-activity-toggle]")) {
				return;
			}
			setActivityPanelOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("pointerdown", onPointerDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("pointerdown", onPointerDown);
		};
	}, [open]);

	return (
		<div className='relative z-40'>
			<ActivityCenterPanel
				open={open}
				live={live}
				items={items}
				pending={pending}
				showPending={showPending}
				confirmPending={confirm.isPending}
				onSkip={() => {
					void skip.mutateAsync();
				}}
				onUpdate={() => {
					void confirm.mutateAsync();
				}}
			/>
			<div className='flex h-6 shrink-0 items-stretch border-t bg-muted/40 text-[11px] leading-none'>
				<div className='flex w-7 shrink-0 cursor-default items-center justify-center border-r'>{running ? <Spinner size='xs' color='foreground' aria-hidden /> : null}</div>
				<button
					type='button'
					data-activity-toggle
					aria-label={open ? "Close activity center" : "Open activity center"}
					aria-expanded={open}
					className='flex min-w-0 flex-1 cursor-pointer items-center px-1.5 text-left'
					onClick={() => {
						toggleActivityPanel();
					}}>
					<p role='status' aria-live='polite' className={failed ? "min-w-0 truncate text-destructive" : "min-w-0 truncate text-muted-foreground"}>
						{message}
					</p>
				</button>
			</div>
		</div>
	);
}
