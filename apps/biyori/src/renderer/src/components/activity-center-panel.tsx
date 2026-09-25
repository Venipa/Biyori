import { BellIcon, CheckIcon, CircleAlertIcon, DownloadIcon, FolderSearchIcon, ListIcon, PlayIcon, RefreshCwIcon, TvIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentType, ReactNode } from "react";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Spinner } from "@/mainview/components/ui/spinner";
import { WatchConfirmActions } from "@/mainview/components/watch-confirm-actions";
import { cn } from "@/mainview/lib/utils";

const SOURCE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
	"library-scan": FolderSearchIcon,
	"list-update": ListIcon,
	"anilist-sync": RefreshCwIcon,
	playback: PlayIcon,
	torrent: DownloadIcon,
	"play-next": TvIcon,
	"episode-ready": PlayIcon,
	"watch-confirm": TvIcon,
};

const panelMotion = {
	initial: { opacity: 0, y: -8 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -8 },
	transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
} as const;

function SourceGlyph({ source }: { source: string }) {
	const Icon = SOURCE_ICONS[source] ?? BellIcon;
	return (
		<span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-muted-foreground'>
			<Icon className='size-3.5' />
		</span>
	);
}

function ActivityStatus({ status }: { status: "live" | "ok" | "error" }) {
	if (status === "live") {
		return <Spinner size='xs' color='foreground' className='shrink-0' aria-label='In progress' />;
	}
	if (status === "error") {
		return <CircleAlertIcon className='size-3.5 shrink-0 text-destructive' aria-label='Failed' />;
	}
	return <CheckIcon className='size-3.5 shrink-0 text-muted-foreground' aria-label='Done' />;
}

function ActivityRow({ source, title, body, status, trailing }: { source: string; title: string; body?: string; status: "live" | "ok" | "error"; trailing?: ReactNode }) {
	const hover = status !== "live" || Boolean(trailing);
	const subtitle = body?.trim() ? body : null;
	return (
		<div className={cn("mx-1 flex cursor-default items-start gap-2 rounded-md px-2 py-1.5", hover ? "hover:bg-primary/10" : null)}>
			<SourceGlyph source={source} />
			<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<div className='flex min-w-0 items-center gap-2'>
					<p className={cn("min-w-0 flex-1 truncate text-xs", status === "error" ? "text-destructive" : "text-foreground")}>{title}</p>
					{trailing ? trailing : <ActivityStatus status={status} />}
				</div>
				{subtitle ? <p className='truncate text-[11px] text-muted-foreground'>{subtitle}</p> : null}
			</div>
		</div>
	);
}

export function ActivityCenterPanel({
	open,
	live,
	items,
	pending,
	showPending,
	confirmPending,
	onSkip,
	onUpdate,
}: {
	open: boolean;
	live: Array<{ source: string; title: string; body?: string }>;
	items: Array<{ id: string; source: string; title: string; body?: string; status: "ok" | "error" }>;
	pending: { title: string; episode: number } | null;
	showPending: boolean;
	confirmPending: boolean;
	onSkip: () => void;
	onUpdate: () => void;
}) {
	const empty = live.length === 0 && items.length === 0 && !showPending;
	const inProgress = live.length + (showPending ? 1 : 0);
	const subtitle = inProgress > 0 ? (inProgress === 1 ? "1 in progress" : `${inProgress} in progress`) : "7-day history";

	return (
		<div className='pointer-events-none fixed top-8 right-0 z-50 overflow-hidden'>
			<AnimatePresence>
				{open ? (
					<motion.div
						key='activity-center'
						data-activity-root
						role='dialog'
						aria-label='Activity'
						className='pointer-events-auto flex max-h-[min(32rem,calc(100dvh-7rem))] w-[min(26rem,100vw)] cursor-default flex-col overflow-hidden rounded-t-none rounded-b-xl border border-t-0 bg-card/80 shadow-lg backdrop-blur-md'
						initial={panelMotion.initial}
						animate={panelMotion.animate}
						exit={panelMotion.exit}
						transition={panelMotion.transition}>
						<div className='flex shrink-0 flex-col gap-0.5 border-b px-3 py-2'>
							<p className='truncate text-xs font-medium'>Activity</p>
							<p className='truncate text-[11px] text-muted-foreground'>{subtitle}</p>
						</div>
						<ScrollArea className='min-h-0 max-h-96 overflow-hidden' viewportClassName='max-h-96 overflow-y-auto'>
							{empty ? (
								<p className='px-3 py-2 text-xs text-muted-foreground'>Nothing yet.</p>
							) : (
								<div className='flex flex-col py-1'>
									{showPending && pending ? (
										<ActivityRow
											source='watch-confirm'
											title={`Update ${pending.title}`}
											body={`Update to episode ${pending.episode}`}
											status='live'
											trailing={<WatchConfirmActions size='xs' disabled={confirmPending} onSkip={onSkip} onUpdate={onUpdate} />}
										/>
									) : null}
									{live.map((row) => (
										<ActivityRow key={row.source} source={row.source} title={row.title} body={row.body} status='live' />
									))}
									{items.map((row) => (
										<ActivityRow key={row.id} source={row.source} title={row.title} body={row.body} status={row.status} />
									))}
								</div>
							)}
						</ScrollArea>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
