import {
	BellIcon,
	CheckIcon,
	CircleAlertIcon,
	DownloadIcon,
	FolderSearchIcon,
	ListIcon,
	PlayIcon,
	RefreshCwIcon,
	TvIcon,
	XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/mainview/components/ui/button";
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
	"watch-confirm": TvIcon,
};

const panelMotion = {
	initial: { opacity: 0, y: 16 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: 16 },
	transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
} as const;

function SourceGlyph({ source }: { source: string }) {
	const Icon = SOURCE_ICONS[source] ?? BellIcon;
	return (
		<span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'>
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

function ActivityRow({
	source,
	title,
	status,
	trailing,
}: {
	source: string;
	title: string;
	status: "live" | "ok" | "error";
	trailing?: ReactNode;
}) {
	const hover = status !== "live" || Boolean(trailing);
	return (
		<div className={cn("mx-1 flex h-8 cursor-default items-center gap-2 rounded-md px-2", hover ? "hover:bg-muted/60" : null)}>
			<SourceGlyph source={source} />
			<p className={cn("min-w-0 flex-1 truncate text-xs", status === "error" ? "text-destructive" : "text-foreground")}>{title}</p>
			{trailing ? trailing : <ActivityStatus status={status} />}
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
	onClose,
	onSkip,
	onUpdate,
}: {
	open: boolean;
	live: Array<{ source: string; title: string }>;
	items: Array<{ id: string; source: string; title: string; status: "ok" | "error" }>;
	pending: { title: string; episode: number } | null;
	showPending: boolean;
	confirmPending: boolean;
	onClose: () => void;
	onSkip: () => void;
	onUpdate: () => void;
}) {
	const empty = live.length === 0 && items.length === 0 && !showPending;
	const inProgress = live.length + (showPending ? 1 : 0);
	const subtitle = inProgress > 0 ? (inProgress === 1 ? "1 in progress" : `${inProgress} in progress`) : "7-day history";

	return (
		<div className='pointer-events-none absolute right-0 bottom-6 overflow-hidden'>
			<AnimatePresence>
				{open ? (
					<motion.div
						key='activity-center'
						role='dialog'
						aria-label='Activity'
						className='pointer-events-auto flex w-[min(22rem,100vw)] cursor-default flex-col overflow-hidden rounded-t-xl rounded-b-none border border-b-0 bg-card shadow-lg'
						initial={panelMotion.initial}
						animate={panelMotion.animate}
						exit={panelMotion.exit}
						transition={panelMotion.transition}>
						<div className='flex h-9 shrink-0 items-center gap-2 border-b px-2'>
							<div className='min-w-0 flex-1'>
								<p className='truncate text-xs font-medium'>Activity</p>
								<p className='truncate text-[11px] text-muted-foreground'>{subtitle}</p>
							</div>
							<Button
								type='button'
								variant='ghost'
								size='icon-xs'
								className='cursor-pointer'
								aria-label='Close activity center'
								onPointerDown={(event) => {
									event.preventDefault();
									event.stopPropagation();
									onClose();
								}}>
								<XIcon />
							</Button>
						</div>
						<ScrollArea className='max-h-72'>
							{empty ? (
								<p className='px-3 py-2 text-xs text-muted-foreground'>Nothing yet.</p>
							) : (
								<div className='flex flex-col py-1'>
									{showPending && pending ? (
										<ActivityRow
											source='watch-confirm'
											title={`Update ${pending.title} to episode ${pending.episode}?`}
											status='live'
											trailing={<WatchConfirmActions size='xs' disabled={confirmPending} onSkip={onSkip} onUpdate={onUpdate} />}
										/>
									) : null}
									{live.map((row) => (
										<ActivityRow key={row.source} source={row.source} title={row.title} status='live' />
									))}
									{items.map((row) => (
										<ActivityRow key={row.id} source={row.source} title={row.title} status={row.status} />
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
