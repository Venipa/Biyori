import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowUpIcon, FileTextIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, resizableTableOptions } from "@/mainview/components/data-table";
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
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/mainview/components/ui/context-menu";
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { TableRow } from "@/mainview/components/ui/table";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { usePersistedColumnSizing } from "@/mainview/lib/table-column-sizing";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";

type HistoryRow = inferRouterOutputs<AppRouter>["history"]["list"]["queued"][number];
type HistoryKind = "history" | "queued";
type HistoryTableRow = HistoryRow & { queued: boolean };

const HISTORY_GROUP_ORDER = ["Queued for update", "History"] as const;

const clearLabels = {
	history: "history",
	queued: "queue",
} as const;

const columns: ColumnDef<HistoryTableRow>[] = [
	{
		accessorKey: "title",
		header: "Anime title",
		size: 280,
		minSize: 120,
		enableSorting: false,
		cell: ({ row }) => (
			<div className='flex min-w-0 items-center gap-2'>
				{row.original.queued ? <ArrowUpIcon className='size-3.5 shrink-0 text-primary' /> : <FileTextIcon className='size-3.5 shrink-0 text-muted-foreground' />}
				<span className='truncate text-primary'>{row.original.title}</span>
			</div>
		),
	},
	{
		accessorKey: "episode",
		header: "Details",
		size: 140,
		enableSorting: false,
		cell: ({ row }) => <span className='text-muted-foreground'>Episode: {row.original.episode}</span>,
	},
	{
		accessorKey: "lastModified",
		header: "Last modified",
		size: 180,
		enableSorting: false,
		cell: ({ row }) => <span className='text-muted-foreground'>{row.original.lastModified}</span>,
	},
];

const EMPTY_ROWS: HistoryTableRow[] = [];

export function HistoryView() {
	const query = trpc.history.list.useQuery();
	const utils = trpc.useUtils();
	const animeInfo = useAnimeInfoNav();
	const [menuRow, setMenuRow] = useState<HistoryRow | null>(null);
	const [clearKind, setClearKind] = useState<HistoryKind | null>(null);

	function refresh(): void {
		void utils.history.list.invalidate();
		void utils.history.queuedCount.invalidate();
	}

	const remove = trpc.history.remove.useMutation({ onSuccess: refresh });
	const clear = trpc.history.clear.useMutation({ onSuccess: refresh });
	const queued = query.data?.queued;
	const history = query.data?.history;
	const rows = useMemo(() => {
		if (!queued && !history) {
			return EMPTY_ROWS;
		}
		return [...(queued ?? []).map((row) => ({ ...row, queued: true })), ...(history ?? []).map((row) => ({ ...row, queued: false }))];
	}, [queued, history]);
	const isEmpty = rows.length === 0;
	const { columnSizing, onColumnSizingChange } = usePersistedColumnSizing("history");

	const table = useReactTable({
		data: rows,
		columns,
		...resizableTableOptions,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => `${row.kind}:${row.id}`,
		onColumnSizingChange,
		state: { columnSizing },
	});

	function openInfo(row: HistoryRow): void {
		if (row.animeId <= 0) {
			return;
		}
		animeInfo.open({ id: row.animeId, infoTab: "main" });
	}

	if (query.isPending && !query.data) {
		return (
			<ScrollArea className='h-full min-h-0'>
				<TableRowsSkeleton columnCount={3} headers={["Anime title", "Details", "Last modified"]} />
			</ScrollArea>
		);
	}

	if (isEmpty) {
		return (
			<Empty>
				<EmptyTitle>No history</EmptyTitle>
				<EmptyDescription>Watched episodes show up here.</EmptyDescription>
			</Empty>
		);
	}

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger className='block h-full min-h-0'>
					<ScrollArea className='h-full'>
						<DataTable
							table={table}
							compact
							groupBy={(row) => (row.original.queued ? "Queued for update" : "History")}
							groupOrder={HISTORY_GROUP_ORDER}
							renderRow={(row, cells) => (
								<TableRow
									className={row.original.animeId > 0 ? "cursor-pointer" : undefined}
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
						Information
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!menuRow || remove.isPending}
						variant='destructive'
						onClick={() => {
							if (menuRow) {
								void remove.mutateAsync({ id: menuRow.id });
							}
						}}>
						Delete
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						disabled={!history || history.length === 0}
						onClick={() => {
							setClearKind("history");
						}}>
						Clear history...
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!queued || queued.length === 0}
						onClick={() => {
							setClearKind("queued");
						}}>
						Clear queue...
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
						<AlertDialogTitle>Clear {clearLabels[clearKind ?? "history"]}</AlertDialogTitle>
						<AlertDialogDescription>
							{clearKind === "queued" ? "Discard all pending list updates? They will not be sent to AniList." : "Remove all history entries?"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
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
							Clear
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
