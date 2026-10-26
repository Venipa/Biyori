import { useTranslation } from "@biyori/translations/react";
import { isToday, isYesterday, parseISO } from "date-fns";
import { BellIcon, CircleAlertIcon, DownloadIcon, FolderSearchIcon, ListIcon, PlayIcon, RefreshCwIcon, TvIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentType, ReactNode } from "react";
import { WatchConfirmActions } from "@/mainview/components/app/confirm/watch-actions";
import { Button } from "@/mainview/components/ui/button";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Spinner } from "@/mainview/components/ui/spinner";
import { formatLocalDateTime, formatTimeAgo } from "@/mainview/lib/format-date";
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
	const { t } = useTranslation();
	if (status === "live") {
		return <Spinner size='xs' color='foreground' className='shrink-0' aria-label={t("shell.statusInProgress")} />;
	}
	if (status === "error") {
		return <CircleAlertIcon className='size-3.5 shrink-0 text-destructive' aria-label={t("shell.failed")} />;
	}
	return null;
}

type HistoryRow = { id: string; source: string; title: string; body?: string; status: "ok" | "error"; createdAt: string };

function dayGroup(createdAt: string): "today" | "yesterday" | "earlier" {
	const date = parseISO(createdAt);
	return isToday(date) ? "today" : isYesterday(date) ? "yesterday" : "earlier";
}

function SectionLabel({ children }: { children: ReactNode }) {
	return <p className='px-3 pt-2 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase'>{children}</p>;
}

function ActivityRow({
	source,
	title,
	body,
	status,
	createdAt,
	trailing,
	onDismiss,
}: {
	source: string;
	title: string;
	body?: string;
	status: "live" | "ok" | "error";
	createdAt?: string;
	trailing?: ReactNode;
	onDismiss?: () => void;
}) {
	const { t } = useTranslation();
	const hover = status !== "live" || Boolean(trailing);
	const subtitle = body?.trim() ? body : null;
	const when = createdAt ? formatLocalDateTime(createdAt) : undefined;
	return (
		<div className={cn("group mx-1 flex cursor-default items-start gap-2 rounded-md px-2 py-1.5", hover ? "hover:bg-primary/10" : null)} title={when}>
			<SourceGlyph source={source} />
			<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<div className='flex min-w-0 items-center gap-2'>
					<p className={cn("min-w-0 flex-1 truncate text-xs", status === "error" ? "text-destructive" : "text-foreground")}>{title}</p>
					{trailing ? trailing : <ActivityStatus status={status} />}
					{createdAt ? (
						<span className='relative shrink-0 text-[11px] text-muted-foreground'>
							<span className={onDismiss ? "group-hover:invisible" : undefined}>{formatTimeAgo(createdAt)}</span>
							{/* overlaid so hover never changes row height */}
							{onDismiss ? (
								<Button
									variant='ghost'
									size='icon-xs'
									className='absolute top-1/2 right-0 hidden size-5 -translate-y-1/2 group-hover:inline-flex'
									aria-label={t("shell.dismiss")}
									onClick={onDismiss}>
									<XIcon />
								</Button>
							) : null}
						</span>
					) : null}
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
	onDismiss,
}: {
	open: boolean;
	live: Array<{ source: string; title: string; body?: string }>;
	items: HistoryRow[];
	pending: { title: string; episode: number } | null;
	showPending: boolean;
	confirmPending: boolean;
	onSkip: () => void;
	onUpdate: () => void;
	onDismiss: (id?: string) => void;
}) {
	const { t } = useTranslation();
	const groups = Map.groupBy(items, (row) => dayGroup(row.createdAt));
	const empty = live.length === 0 && items.length === 0 && !showPending;
	const inProgress = live.length + (showPending ? 1 : 0);
	const subtitle = inProgress > 0 ? t("shell.inProgress", { count: inProgress }) : t("shell.sevenDayHistory");

	return (
		<div className='pointer-events-none fixed top-8 right-0 z-50 overflow-hidden'>
			<AnimatePresence>
				{open ? (
					<motion.div
						key='activity-center'
						data-activity-root
						role='dialog'
						aria-label={t("shell.activity")}
						className='pointer-events-auto flex max-h-[min(32rem,calc(100dvh-7rem))] w-[min(26rem,100vw)] cursor-default flex-col overflow-hidden rounded-t-none rounded-b-xl border border-t-0 bg-card/80 shadow-lg backdrop-blur-md'
						initial={panelMotion.initial}
						animate={panelMotion.animate}
						exit={panelMotion.exit}
						transition={panelMotion.transition}>
						<div className='flex shrink-0 items-center gap-2 border-b px-3 py-2'>
							<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
								<p className='truncate text-xs font-medium'>{t("shell.activity")}</p>
								<p className='truncate text-[11px] text-muted-foreground'>{subtitle}</p>
							</div>
							{items.length > 0 ? (
								<Button variant='ghost' size='xs' onClick={() => onDismiss()}>
									{t("shell.clearAll")}
								</Button>
							) : null}
						</div>
						<ScrollArea className='min-h-0 max-h-96 overflow-hidden' viewportClassName='max-h-96 overflow-y-auto'>
							{empty ? (
								<p className='px-3 py-2 text-xs text-muted-foreground'>{t("shell.nothingYet")}</p>
							) : (
								<div className='flex flex-col pb-1'>
									{inProgress > 0 ? <SectionLabel>{t("shell.now")}</SectionLabel> : null}
									{showPending && pending ? (
										<ActivityRow
											source='watch-confirm'
											title={t("shell.updateNamed", { name: pending.title })}
											body={t("shell.updateToEpisode", { episode: pending.episode })}
											status='live'
											trailing={<WatchConfirmActions size='xs' disabled={confirmPending} onSkip={onSkip} onUpdate={onUpdate} />}
										/>
									) : null}
									{live.map((row) => (
										<ActivityRow key={row.source} source={row.source} title={row.title} body={row.body} status='live' />
									))}
									{(["today", "yesterday", "earlier"] as const).map((group) => {
										const rows = groups.get(group);
										if (!rows) {
											return null;
										}
										return (
											<div key={group} className='flex flex-col'>
												<SectionLabel>{t(`shell.${group}`)}</SectionLabel>
												{rows.map((row) => (
													<ActivityRow
														key={row.id}
														source={row.source}
														title={row.title}
														body={row.body}
														status={row.status}
														createdAt={row.createdAt}
														onDismiss={() => onDismiss(row.id)}
													/>
												))}
											</div>
										);
									})}
								</div>
							)}
						</ScrollArea>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
