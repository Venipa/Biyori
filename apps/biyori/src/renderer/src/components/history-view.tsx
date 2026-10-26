import { t, useTranslation } from "@biyori/translations/react";
import { useMemo, useState } from "react";
import { groupHistory, type HistoryGroupRow } from "@/lib/history-timeline";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { listStatusLabel } from "@/mainview/components/app/anime/list-action";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/mainview/components/ui/alert-dialog";
import { Button } from "@/mainview/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/mainview/components/ui/context-menu";
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Spinner } from "@/mainview/components/ui/spinner";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { trpc } from "@/mainview/trpc";

type HistoryKind = "history" | "queued";

const PAGE_SIZE = 200;

function dayLabel(time: number): string {
	const day = new Date(time);
	const today = new Date();
	const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
	if (day.toDateString() === today.toDateString()) {
		return t("history.today");
	}
	if (day.toDateString() === yesterday.toDateString()) {
		return t("history.yesterday");
	}
	return day.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: day.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

/** "Ep 3–7 · Completed · Score 8": what the row changed, newest values. */
function changeSummary(row: HistoryGroupRow): string {
	const parts: string[] = [];
	if (row.episodes) {
		const { from, to } = row.episodes;
		parts.push(from === to ? t("history.episodeShort", { episode: to }) : t("history.episodeRange", { from, to }));
	}
	const { status, score, notes, rewatch, dates } = row.changes;
	if (status) parts.push(listStatusLabel(status));
	if (score !== undefined) parts.push(score ? t("history.score", { score }) : t("history.noScore"));
	if (rewatch) parts.push(t("history.rewatch"));
	if (notes) parts.push(t("history.notes"));
	if (dates) parts.push(t("history.dates"));
	return parts.join(" · ");
}

function HistoryRowItem({ row, onOpen, onMenu }: { row: HistoryGroupRow; onOpen: () => void; onMenu: () => void }) {
	const { t } = useTranslation();
	return (
		<li>
			<button
				type='button'
				disabled={row.animeId <= 0}
				onClick={onOpen}
				onContextMenu={onMenu}
				className='flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted disabled:cursor-default disabled:hover:bg-transparent'>
				<AnimeCover
					id={row.animeId > 0 ? row.animeId : null}
					coverUrl={row.coverUrl || undefined}
					alt=''
					className='aspect-2/3 w-8 shrink-0 overflow-hidden rounded-sm bg-muted'
					lazy
				/>
				<span className='flex min-w-0 flex-1 flex-col'>
					<span className='truncate'>{row.title}</span>
					<span className='truncate text-xs text-muted-foreground tabular-nums'>
						{changeSummary(row)}
						{row.episodes && row.episodes.count > 1 ? ` · ${t("history.episodes", { count: row.episodes.count })}` : ""}
					</span>
				</span>
				<span className='shrink-0 text-xs text-muted-foreground tabular-nums'>{new Date(row.time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
			</button>
		</li>
	);
}

export function HistoryView() {
	const { t } = useTranslation();
	const query = trpc.history.page.useInfiniteQuery({ limit: PAGE_SIZE }, { getNextPageParam: (page) => page.nextCursor });
	const utils = trpc.useUtils();
	const animeInfo = useAnimeInfoNav();
	const [menuRow, setMenuRow] = useState<HistoryGroupRow | null>(null);
	const [clearKind, setClearKind] = useState<HistoryKind | null>(null);

	function refresh(): void {
		void utils.history.page.invalidate();
		void utils.history.list.invalidate();
		void utils.history.latest.invalidate();
		void utils.history.queuedCount.invalidate();
	}

	const remove = trpc.history.remove.useMutation({ onSuccess: refresh });
	const clear = trpc.history.clear.useMutation({ onSuccess: refresh });
	const pages = query.data?.pages;
	const queued = useMemo(() => groupHistory(pages?.[0]?.queued ?? []).flatMap((day) => day.rows), [pages]);
	const days = useMemo(() => groupHistory(pages?.flatMap((page) => page.items) ?? []), [pages]);
	const hasHistory = days.length > 0;

	function openInfo(row: HistoryGroupRow): void {
		if (row.animeId > 0) {
			animeInfo.open({ id: row.animeId, infoTab: "main", title: row.title, coverUrl: row.coverUrl || undefined });
		}
	}

	function renderRow(row: HistoryGroupRow) {
		return (
			<HistoryRowItem
				key={row.ids[0]}
				row={row}
				onOpen={() => {
					openInfo(row);
				}}
				onMenu={() => {
					setMenuRow(row);
				}}
			/>
		);
	}

	if (query.isPending) {
		return (
			<div className='flex max-w-3xl flex-col gap-2 px-6 py-5'>
				{["s0", "s1", "s2", "s3", "s4", "s5"].map((id) => (
					<Skeleton key={id} className='h-12 rounded-md' />
				))}
			</div>
		);
	}

	if (!hasHistory && queued.length === 0) {
		return (
			<Empty>
				<EmptyTitle>{t("history.noHistory")}</EmptyTitle>
				<EmptyDescription>{t("history.emptyDescription")}</EmptyDescription>
			</Empty>
		);
	}

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger className='block h-full min-h-0'>
					<ScrollArea className='h-full' viewportClassName='px-6 py-5'>
						<div className='flex max-w-3xl flex-col gap-5'>
							{queued.length > 0 ? (
								<section className='flex flex-col gap-2 rounded-lg border bg-card p-3'>
									<h2 className='px-2 text-xs font-medium text-muted-foreground'>{t("history.queuedSummary", { count: queued.length })}</h2>
									<ul className='flex flex-col'>{queued.map(renderRow)}</ul>
								</section>
							) : null}
							{days.map((day) => (
								<section key={day.key} className='flex flex-col gap-1'>
									<h2 className='px-2 text-xs font-medium text-muted-foreground'>{dayLabel(day.time)}</h2>
									<ul className='flex flex-col'>{day.rows.map(renderRow)}</ul>
								</section>
							))}
							{query.hasNextPage ? (
								<Button
									variant='ghost'
									size='sm'
									className='self-start text-muted-foreground'
									disabled={query.isFetchingNextPage}
									onClick={() => {
										void query.fetchNextPage();
									}}>
									{query.isFetchingNextPage ? <Spinner size='xs' aria-hidden /> : null}
									{t("history.loadOlder")}
								</Button>
							) : null}
						</div>
					</ScrollArea>
				</ContextMenuTrigger>
				<ContextMenuContent className='min-w-48'>
					<ContextMenuItem
						disabled={!menuRow || menuRow.animeId <= 0}
						onClick={() => {
							if (menuRow) {
								openInfo(menuRow);
							}
						}}>
						{t("history.information")}
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!menuRow || remove.isPending}
						variant='destructive'
						onClick={() => {
							if (menuRow) {
								void remove.mutateAsync({ ids: menuRow.ids });
							}
						}}>
						{t("common.delete")}
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						disabled={!hasHistory}
						onClick={() => {
							setClearKind("history");
						}}>
						{t("history.clearHistoryMenu")}
					</ContextMenuItem>
					<ContextMenuItem
						disabled={queued.length === 0}
						onClick={() => {
							setClearKind("queued");
						}}>
						{t("history.clearQueueMenu")}
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
			<AlertDialog
				open={clearKind != null}
				onOpenChange={(open) => {
					if (!open) {
						setClearKind(null);
					}
				}}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{clearKind === "queued" ? t("history.clearQueueTitle") : t("history.clearHistoryTitle")}</AlertDialogTitle>
						<AlertDialogDescription>{clearKind === "queued" ? t("history.discardQueued") : t("history.removeHistory")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							variant='destructive'
							disabled={clear.isPending}
							onClick={() => {
								if (!clearKind) {
									return;
								}
								void clear.mutateAsync({ kind: clearKind }).then(() => {
									setClearKind(null);
								});
							}}>
							{t("history.clear")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
