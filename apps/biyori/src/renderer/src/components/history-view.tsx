import { t, useTranslation } from "@biyori/translations/react";
import { getRouteApi } from "@tanstack/react-router";
import { type ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, type SortingState, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { groupHistory, HISTORY_CHANGE_TYPES, type HistoryChangeType, type HistoryGroupRow, matchesHistoryTypes, parseHistoryTypes } from "@/lib/history-timeline";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { listStatusLabel } from "@/mainview/components/app/anime/list-action";
import { DataTable, resizableTableOptions } from "@/mainview/components/app/shared/data-table";
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
import { Spinner } from "@/mainview/components/ui/spinner";
import { TableRow } from "@/mainview/components/ui/table";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
import { Toggle } from "@/mainview/components/ui/toggle";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { usePersistedColumnSizing } from "@/mainview/lib/table-column-sizing";
import { trpc } from "@/mainview/trpc";

const route = getRouteApi("/app/history");

type HistoryKind = "history" | "queued";
type HistoryTableRow = HistoryGroupRow & { group: string };

const PAGE_SIZE = 200;
const QUEUED_GROUP = "queued";

const typeLabelKey = {
	episode: "history.filterEpisodes",
	status: "history.filterStatus",
	score: "history.filterScore",
	notes: "history.notes",
	rewatch: "history.rewatch",
	dates: "history.dates",
} as const satisfies Record<HistoryChangeType, string>;

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

const columns: ColumnDef<HistoryTableRow>[] = [
	{
		id: "time",
		accessorKey: "time",
		header: () => t("history.columnTime"),
		size: 80,
		minSize: 72,
		cell: ({ row }) => (
			<span className='text-muted-foreground tabular-nums'>{new Date(row.original.time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
		),
	},
	{
		id: "title",
		accessorKey: "title",
		header: () => t("history.columnTitle"),
		size: 320,
		minSize: 160,
		meta: { className: "min-w-0" },
		cell: ({ row }) => (
			<span className='flex min-w-0 items-center gap-2'>
				<AnimeCover
					id={row.original.animeId > 0 ? row.original.animeId : null}
					coverUrl={row.original.coverUrl || undefined}
					alt=''
					lazy
					className='aspect-2/3 w-4 shrink-0 overflow-hidden rounded-xs bg-muted'
				/>
				<span className='truncate' title={row.original.title}>
					{row.original.title}
				</span>
			</span>
		),
	},
	{
		id: "change",
		accessorFn: changeSummary,
		header: () => t("history.columnChange"),
		size: 240,
		minSize: 120,
		cell: ({ getValue }) => <span className='block truncate text-muted-foreground tabular-nums'>{getValue<string>()}</span>,
	},
	{
		id: "episodes",
		accessorFn: (row) => row.episodes?.count ?? 0,
		header: () => t("history.columnEpisodes"),
		size: 72,
		minSize: 72,
		cell: ({ row }) => <span className='text-muted-foreground tabular-nums'>{row.original.episodes?.count ?? "-"}</span>,
	},
];

export function HistoryView() {
	const { t } = useTranslation();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const types = parseHistoryTypes(search.types);
	const query = trpc.history.page.useInfiniteQuery({ limit: PAGE_SIZE }, { getNextPageParam: (page) => page.nextCursor });
	const utils = trpc.useUtils();
	const animeInfo = useAnimeInfoNav();
	const sizing = usePersistedColumnSizing("history");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [menuRow, setMenuRow] = useState<HistoryGroupRow | null>(null);
	const [clearKind, setClearKind] = useState<HistoryKind | null>(null);

	function refresh(): void {
		void utils.history.page.invalidate();
		void utils.history.recentPlays.invalidate();
		void utils.history.latest.invalidate();
		void utils.history.queuedCount.invalidate();
	}

	const remove = trpc.history.remove.useMutation({ onSuccess: refresh });
	const clear = trpc.history.clear.useMutation({ onSuccess: refresh });
	const pages = query.data?.pages;
	const { rows, groupLabels, queuedCount, hasHistory } = useMemo(() => {
		const labels = new Map<string, string>();
		const queued = groupHistory(pages?.[0]?.queued ?? []).flatMap((day) => day.rows);
		labels.set(QUEUED_GROUP, t("history.queuedSummary", { count: queued.length }));
		const days = groupHistory(pages?.flatMap((page) => page.items) ?? []);
		const all: HistoryTableRow[] = queued.map((row) => ({ ...row, group: QUEUED_GROUP }));
		for (const day of days) {
			labels.set(day.key, dayLabel(day.time));
			all.push(...day.rows.map((row) => ({ ...row, group: day.key })));
		}
		return { rows: all.filter((row) => matchesHistoryTypes(row, types)), groupLabels: labels, queuedCount: queued.length, hasHistory: days.length > 0 };
		// biome-ignore lint/correctness/useExhaustiveDependencies: types is derived from search.types
	}, [pages, search.types, t]);

	const table = useReactTable({
		data: rows,
		columns,
		...resizableTableOptions,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => `${row.group}:${row.ids[0]}`,
		onSortingChange: setSorting,
		onColumnSizingChange: sizing.onColumnSizingChange,
		state: { sorting, columnSizing: sizing.columnSizing },
	});

	function toggleType(type: HistoryChangeType, pressed: boolean): void {
		const next = HISTORY_CHANGE_TYPES.filter((item) => (item === type ? pressed : types.includes(item)));
		void navigate({ search: (prev) => ({ ...prev, types: next.length > 0 ? next.join(",") : undefined }), replace: true });
	}

	function openInfo(row: HistoryGroupRow): void {
		if (row.animeId > 0) {
			animeInfo.open({ id: row.animeId, infoTab: "main", title: row.title, coverUrl: row.coverUrl || undefined });
		}
	}

	if (!query.isPending && !hasHistory && queuedCount === 0) {
		return (
			<Empty>
				<EmptyTitle>{t("history.noHistory")}</EmptyTitle>
				<EmptyDescription>{t("history.emptyDescription")}</EmptyDescription>
			</Empty>
		);
	}

	return (
		<div className='flex h-full min-h-0 flex-col'>
			<div role='group' aria-label={t("history.filterLabel")} className='flex shrink-0 flex-wrap items-center gap-1 border-b bg-card px-3 py-1.5'>
				{HISTORY_CHANGE_TYPES.map((type) => (
					<Toggle
						key={type}
						size='sm'
						variant='outline'
						pressed={types.includes(type)}
						onPressedChange={(pressed) => {
							toggleType(type, pressed);
						}}>
						{t(typeLabelKey[type])}
					</Toggle>
				))}
			</div>
			<div className='min-h-0 flex-1'>
				<ContextMenu>
					<ContextMenuTrigger className='block h-full min-h-0'>
						<ScrollArea className='h-full'>
							{query.isPending ? (
								<TableRowsSkeleton columnCount={columns.length} headers={table.getFlatHeaders().map((header) => flexRender(header.column.columnDef.header, header.getContext()))} />
							) : (
								<DataTable
									table={table}
									compact
									rowSize={32}
									groupBy={(row) => row.original.group}
									groupLabel={(value) => groupLabels.get(String(value)) ?? String(value)}
									renderRow={(row, cells) => (
										<TableRow
											className='cursor-pointer data-stripe:bg-muted/25'
											onClick={() => {
												openInfo(row.original);
											}}
											onContextMenu={() => {
												setMenuRow(row.original);
											}}>
											{cells}
										</TableRow>
									)}
								/>
							)}
							{query.hasNextPage ? (
								<Button
									variant='ghost'
									size='sm'
									className='m-2 text-muted-foreground'
									disabled={query.isFetchingNextPage}
									onClick={() => {
										void query.fetchNextPage();
									}}>
									{query.isFetchingNextPage ? <Spinner size='xs' aria-hidden /> : null}
									{t("history.loadOlder")}
								</Button>
							) : null}
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
							disabled={queuedCount === 0}
							onClick={() => {
								setClearKind("queued");
							}}>
							{t("history.clearQueueMenu")}
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</div>
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
		</div>
	);
}
