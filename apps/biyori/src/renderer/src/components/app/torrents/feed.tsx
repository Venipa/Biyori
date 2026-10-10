import { useTranslation } from "@biyori/translations/react";
import { useNavigate } from "@tanstack/react-router";
import { type ColumnDef, getCoreRowModel, getSortedRowModel, type RowSelectionState, type SortingState, useReactTable } from "@tanstack/react-table";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { AiringStatusMark } from "@/components/app/anime/airing-status";
import { DataTable, resizableTableOptions } from "@/mainview/components/app/shared/data-table";
import { TorrentInfoDialog } from "@/mainview/components/app/torrents/info-dialog";
import { countLabel, type TorrentRow } from "@/mainview/components/app/torrents/row";
import { CheckNewTorrentsButton, TorrentToolbar } from "@/mainview/components/app/torrents/toolbar";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/mainview/components/ui/context-menu";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { TableRow } from "@/mainview/components/ui/table";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { formatLocalDateTime } from "@/mainview/lib/format-date";
import { usePersistedColumnSizing } from "@/mainview/lib/table-column-sizing";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";

export function selectionFrom(items: TorrentRow[]): RowSelectionState {
	return Object.fromEntries(items.filter((item) => item.state === "selected").map((item) => [item.guid, true]));
}

export function TorrentFeed({ items }: { items: TorrentRow[] }): ReactElement {
	const utils = trpc.useUtils();
	const navigate = useNavigate();
	const animeInfo = useAnimeInfoNav();
	const searchFeed = trpc.torrents.search.useMutation({
		onSuccess: (next) => {
			utils.torrents.list.setData(undefined, next);
		},
	});
	const download = trpc.torrents.download.useMutation();
	const downloadMarked = trpc.torrents.downloadMarked.useMutation();
	const preferFansub = trpc.torrents.preferFansub.useMutation({
		onSuccess: (next) => {
			utils.torrents.list.setData(undefined, next);
			void utils.settings.get.invalidate();
		},
	});
	const discard = trpc.torrents.discard.useMutation({
		onSuccess: (next) => {
			utils.torrents.list.setData(undefined, next);
		},
	});
	const discardAnime = trpc.torrents.discardAnime.useMutation({
		onSuccess: (next) => {
			utils.torrents.list.setData(undefined, next);
			void utils.settings.get.invalidate();
		},
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>(() => selectionFrom(items));
	const [menuRow, setMenuRow] = useState<TorrentRow | null>(null);
	const [infoRow, setInfoRow] = useState<TorrentRow | null>(null);
	const rowClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { t } = useTranslation();
	const { columnSizing, onColumnSizingChange } = usePersistedColumnSizing("torrents");

	useEffect(() => {
		return () => {
			if (rowClickTimer.current != null) {
				clearTimeout(rowClickTimer.current);
			}
		};
	}, []);

	const columns: ColumnDef<TorrentRow>[] = [
		{
			id: "select",
			enableSorting: false,
			enableResizing: false,
			size: 36,
			minSize: 36,
			maxSize: 36,
			header: ({ table }) => (
				<Checkbox
					aria-label={t("torrents.selectAll")}
					checked={table.getIsAllRowsSelected()}
					onCheckedChange={(checked) => {
						table.toggleAllRowsSelected(Boolean(checked));
					}}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					aria-label={t("torrents.selectRow", { title: row.original.animeTitle })}
					checked={row.getIsSelected()}
					onCheckedChange={(checked) => {
						row.toggleSelected(Boolean(checked));
					}}
					onClick={(event) => {
						event.stopPropagation();
					}}
					onDoubleClick={(event) => {
						event.stopPropagation();
					}}
					onPointerDown={(event) => {
						event.stopPropagation();
					}}
				/>
			),
		},
		{
			accessorKey: "animeTitle",
			header: t("torrents.animeTitle"),
			size: 240,
			minSize: 120,
			cell: ({ row }) => (
				<div className='flex min-w-0 items-center gap-2'>
					<AiringStatusMark status={row.original.matched ? row.original.airingStatus || null : null} shape='dot' />
					<span className='truncate font-medium'>{row.original.animeTitle}</span>
				</div>
			),
		},
		{
			accessorKey: "episode",
			header: t("torrents.episode"),
			cell: ({ row }) => (
				<span
					className={
						row.original.state === "selected"
							? "tabular-nums text-primary"
							: row.original.matched && row.original.episode != null
								? "tabular-nums text-blue-600 dark:text-blue-400"
								: "tabular-nums text-muted-foreground"
					}>
					{row.original.episode ?? "-"}
				</span>
			),
		},
		{
			accessorKey: "group",
			header: t("torrents.group"),
			cell: ({ row }) => row.original.group || "-",
		},
		{
			accessorKey: "size",
			header: t("torrents.size"),
			cell: ({ row }) => <span className='tabular-nums'>{row.original.size || "-"}</span>,
		},
		{
			accessorKey: "videoFormat",
			header: t("torrents.video"),
			cell: ({ row }) => row.original.videoFormat || "-",
		},
		{
			accessorKey: "seeders",
			header: t("torrents.seeders"),
			cell: ({ row }) => <span className='tabular-nums'>{countLabel(row.original.seeders)}</span>,
		},
		{
			accessorKey: "leechers",
			header: t("torrents.leechers"),
			cell: ({ row }) => <span className='tabular-nums'>{countLabel(row.original.leechers)}</span>,
		},
		{
			accessorKey: "downloads",
			header: t("torrents.downloads"),
			cell: ({ row }) => <span className='tabular-nums'>{countLabel(row.original.downloads)}</span>,
		},
		{
			accessorKey: "filename",
			header: t("torrents.filename"),
			cell: ({ row }) => (
				<span className='block max-w-72 truncate' title={row.original.filename}>
					{row.original.filename || row.original.title}
				</span>
			),
		},
		{
			accessorKey: "pubDate",
			header: t("torrents.releaseDate"),
			cell: ({ row }) => <span className='tabular-nums'>{formatLocalDateTime(row.original.pubDate)}</span>,
		},
	];

	const table = useReactTable({
		data: items,
		columns,
		...resizableTableOptions,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => row.guid,
		enableRowSelection: true,
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		onColumnSizingChange,
		state: { sorting, rowSelection, columnSizing },
	});

	const selected = table.getSelectedRowModel().rows;
	const menuOnList = Boolean(menuRow?.matched && menuRow.animeId != null);

	function clearRowClickTimer(): void {
		if (rowClickTimer.current == null) {
			return;
		}
		clearTimeout(rowClickTimer.current);
		rowClickTimer.current = null;
	}

	function openTorrentInfo(row: TorrentRow): void {
		setInfoRow(row);
	}

	function downloadTorrent(row: TorrentRow): void {
		if (!row.link) {
			return;
		}
		void download.mutateAsync({ guid: row.guid });
	}

	return (
		<div className='flex h-full min-h-0 flex-col'>
			<TorrentToolbar>
				<Button
					variant='outline'
					size='sm'
					disabled={selected.length === 0 || downloadMarked.isPending}
					onClick={() => {
						void downloadMarked.mutateAsync({
							guids: selected.map((row) => row.original.guid),
						});
					}}>
					{t("torrents.downloadMarked")}
				</Button>
				<Button
					variant='outline'
					size='sm'
					disabled={selected.length === 0}
					onClick={() => {
						for (const row of selected) {
							void discard.mutateAsync({ guid: row.original.guid });
						}
						setRowSelection({});
					}}>
					{t("torrents.discardAll")}
				</Button>
				<CheckNewTorrentsButton />
			</TorrentToolbar>
			<ScrollArea className='h-full flex-1'>
				<ContextMenu>
					<ContextMenuTrigger className='block h-full min-h-0'>
						<DataTable
							table={table}
							renderRow={(row, cells) => (
								<TableRow
									data-state={row.getIsSelected() ? "selected" : undefined}
									className={cn(
										"cursor-pointer",
										(row.original.state === "discarded_normal" || row.original.state === "discarded_inactive") && "text-muted-foreground",
										row.original.state === "discarded_inactive" && "opacity-60",
										row.original.state === "selected" && row.original.newEpisode && "bg-primary/10",
										row.original.state !== "selected" &&
											!row.original.matched &&
											"text-muted-foreground **:text-muted-foreground! [&_.text-blue-400]:text-muted-foreground! [&_.text-blue-600]:text-muted-foreground! [&_.text-primary]:text-muted-foreground!",
									)}
									onClick={(event) => {
										if (event.detail > 1) {
											return;
										}
										clearRowClickTimer();
										const item = row.original;
										rowClickTimer.current = setTimeout(() => {
											rowClickTimer.current = null;
											openTorrentInfo(item);
										}, 250);
									}}
									onDoubleClick={() => {
										clearRowClickTimer();
										downloadTorrent(row.original);
									}}
									onContextMenu={() => {
										setMenuRow(row.original);
									}}>
									{cells}
								</TableRow>
							)}
						/>
					</ContextMenuTrigger>
					<ContextMenuContent className='min-w-64'>
						<ContextMenuItem
							className='font-semibold'
							disabled={!menuRow?.link}
							onClick={() => {
								if (!menuRow) {
									return;
								}
								downloadTorrent(menuRow);
							}}>
							{t("torrents.downloadTorrent")}
						</ContextMenuItem>
						<ContextMenuItem
							disabled={!menuOnList}
							onClick={() => {
								if (!menuRow?.animeId) {
									return;
								}
								animeInfo.open({ id: menuRow.animeId, infoTab: "main" });
							}}>
							{t("torrents.viewAnime")}
						</ContextMenuItem>
						<ContextMenuItem
							disabled={!menuRow}
							onClick={() => {
								if (!menuRow) {
									return;
								}
								openTorrentInfo(menuRow);
							}}>
							{t("torrents.viewTorrent")}
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem
							disabled={!menuRow}
							onClick={() => {
								if (!menuRow) {
									return;
								}
								void discard.mutateAsync({ guid: menuRow.guid });
							}}>
							{t("torrents.discard")}
						</ContextMenuItem>
						<ContextMenuSub>
							<ContextMenuSubTrigger disabled={!menuOnList}>{t("torrents.quickFilters")}</ContextMenuSubTrigger>
							<ContextMenuSubContent className='min-w-72'>
								<ContextMenuItem
									disabled={!menuOnList}
									onClick={() => {
										if (!menuRow?.animeId) {
											return;
										}
										void discardAnime.mutateAsync({
											animeId: menuRow.animeId,
											title: menuRow.animeTitle,
										});
									}}>
									{t("torrents.discardAnime")}
								</ContextMenuItem>
								<ContextMenuItem
									disabled={!menuOnList || !menuRow?.group}
									onClick={() => {
										if (!menuRow?.animeId || !menuRow.group) {
											return;
										}
										void preferFansub.mutateAsync({
											animeId: menuRow.animeId,
											group: menuRow.group,
											title: menuRow.animeTitle,
										});
									}}>
									{t("torrents.preferFansub")}
								</ContextMenuItem>
							</ContextMenuSubContent>
						</ContextMenuSub>
						<ContextMenuSeparator />
						<ContextMenuItem
							disabled={!menuRow?.animeTitle}
							onClick={() => {
								if (!menuRow) {
									return;
								}
								void searchFeed.mutateAsync({ title: menuRow.animeTitle });
							}}>
							{t("torrents.searchMore")}
						</ContextMenuItem>
						<ContextMenuItem
							disabled={!menuRow?.animeTitle}
							onClick={() => {
								if (!menuRow) {
									return;
								}
								void navigate({
									to: "/app/search",
									search: { q: menuRow.animeTitle },
								});
							}}>
							{t("torrents.searchAnime")}
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</ScrollArea>
			<TorrentInfoDialog
				row={infoRow}
				onOpenChange={(open) => {
					if (!open) {
						setInfoRow(null);
					}
				}}
				onDownload={downloadTorrent}
				onViewAnime={(id) => {
					animeInfo.open({ id, infoTab: "main" });
				}}
			/>
		</div>
	);
}
