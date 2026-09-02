import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ColumnDef, getCoreRowModel, getSortedRowModel, type RowSelectionState, type SortingState, useReactTable } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { AiringStatusMark } from "@/components/airing-status";
import { desktopRpc } from "@/desktop-rpc";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { DataTable, resizableTableOptions } from "@/mainview/components/data-table";
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
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { TableRow } from "@/mainview/components/ui/table";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { formatLocalDateTime } from "@/mainview/lib/format-date";
import { usePersistedColumnSizing } from "@/mainview/lib/table-column-sizing";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";

export const Route = createFileRoute("/app/torrents")({
	validateSearch: animeInfoSearchSchema,
	component: TorrentsPage,
});

type TorrentRow = inferRouterOutputs<AppRouter>["torrents"]["list"][number];

function countLabel(value: number | null): string {
	return value == null ? "-" : String(value);
}

function formatCheckRemaining(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;
	if (hours > 0) {
		return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
	}
	return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function NextTorrentCheck(): ReactElement {
	const utils = trpc.useUtils();
	const poll = trpc.torrents.poll.useQuery();
	trpc.torrents.onPoll.useSubscription(undefined, {
		onData: (next) => {
			utils.torrents.poll.setData(undefined, next);
		},
	});
	const enabled = poll.data?.enabled ?? false;
	const nextCheckAt = poll.data?.nextCheckAt ?? null;
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!enabled || nextCheckAt == null) {
			return;
		}
		const id = setInterval(() => {
			setNow(Date.now());
		}, 1000);
		return () => {
			clearInterval(id);
		};
	}, [enabled, nextCheckAt]);

	if (!enabled) {
		return <p className='text-sm text-muted-foreground'>Automatic checks are off</p>;
	}
	if (nextCheckAt == null) {
		return <p className='text-sm text-muted-foreground'>Next check pending</p>;
	}
	const remaining = nextCheckAt - now;
	return (
		<p className='text-sm text-muted-foreground tabular-nums'>
			{remaining <= 0 ? "Checking..." : `Next check in ${formatCheckRemaining(remaining)}`}
		</p>
	);
}

function CheckNewTorrentsButton(): ReactElement {
	const utils = trpc.useUtils();
	const refresh = trpc.torrents.refresh.useMutation({
		onSuccess: (next) => {
			utils.torrents.list.setData(undefined, next);
		},
	});
	return (
		<Button
			variant='outline'
			size='sm'
			disabled={refresh.isPending}
			onClick={() => {
				void refresh.mutateAsync();
			}}>
			Check new torrents
		</Button>
	);
}

function TorrentToolbar({ children }: { children?: ReactNode }): ReactElement {
	return (
		<div className='flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2'>
			<NextTorrentCheck />
			<div className='flex gap-2'>{children}</div>
		</div>
	);
}

function TorrentsPage(): ReactElement {
	const query = trpc.torrents.list.useQuery();
	const utils = trpc.useUtils();
	const items = query.data ?? [];
	trpc.torrents.onList.useSubscription(undefined, {
		onData: (next) => {
			utils.torrents.list.setData(undefined, next);
		},
	});

	return (
		<div className='flex h-full min-h-0 flex-col'>
			{items.length === 0 ? (
				<TorrentToolbar>
					<CheckNewTorrentsButton />
				</TorrentToolbar>
			) : null}
			{query.isPending && items.length === 0 ? <TableRowsSkeleton columnCount={12} /> : null}
			{items.length === 0 && !query.isLoading ? (
				<Empty>
					<EmptyTitle>No torrents found</EmptyTitle>
					<EmptyDescription>Matching torrents for your list will be listed here.</EmptyDescription>
				</Empty>
			) : null}
			{items.length > 0 ? <TorrentFeed key={items.map((item) => `${item.guid}:${item.state}`).join("|")} items={items} /> : null}
		</div>
	);
}

function selectionFrom(items: TorrentRow[]): RowSelectionState {
	return Object.fromEntries(items.filter((item) => item.state === "selected").map((item) => [item.guid, true]));
}

function TorrentFeed({ items }: { items: TorrentRow[] }): ReactElement {
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
	const { columnSizing, onColumnSizingChange } = usePersistedColumnSizing("torrents");

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
					aria-label='Select all torrents'
					checked={table.getIsAllRowsSelected()}
					onCheckedChange={(checked) => {
						table.toggleAllRowsSelected(Boolean(checked));
					}}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					aria-label={`Select ${row.original.animeTitle}`}
					checked={row.getIsSelected()}
					onCheckedChange={(checked) => {
						row.toggleSelected(Boolean(checked));
					}}
					onClick={(event) => {
						event.stopPropagation();
					}}
				/>
			),
		},
		{
			accessorKey: "animeTitle",
			header: "Anime title",
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
			header: "Episode",
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
			header: "Group",
			cell: ({ row }) => row.original.group || "-",
		},
		{
			accessorKey: "size",
			header: "Size",
			cell: ({ row }) => <span className='tabular-nums'>{row.original.size || "-"}</span>,
		},
		{
			accessorKey: "videoFormat",
			header: "Video",
			cell: ({ row }) => row.original.videoFormat || "-",
		},
		{
			accessorKey: "seeders",
			header: "S",
			cell: ({ row }) => <span className='tabular-nums'>{countLabel(row.original.seeders)}</span>,
		},
		{
			accessorKey: "leechers",
			header: "L",
			cell: ({ row }) => <span className='tabular-nums'>{countLabel(row.original.leechers)}</span>,
		},
		{
			accessorKey: "downloads",
			header: "D",
			cell: ({ row }) => <span className='tabular-nums'>{countLabel(row.original.downloads)}</span>,
		},
		{
			accessorKey: "description",
			header: "Description",
			cell: ({ row }) => (
				<span className='block max-w-56 truncate text-muted-foreground' title={row.original.description}>
					{row.original.description || "-"}
				</span>
			),
		},
		{
			accessorKey: "filename",
			header: "Filename",
			cell: ({ row }) => (
				<span className='block max-w-72 truncate' title={row.original.filename}>
					{row.original.filename || row.original.title}
				</span>
			),
		},
		{
			accessorKey: "pubDate",
			header: "Release date",
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
					Download marked torrents
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
					Discard all
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
									onClick={() => {
										row.toggleSelected();
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
								void download.mutateAsync({ guid: menuRow.guid });
							}}>
							Download torrent
						</ContextMenuItem>
						<ContextMenuItem
							disabled={!menuOnList}
							onClick={() => {
								if (!menuRow?.animeId) {
									return;
								}
								animeInfo.open({ id: menuRow.animeId, infoTab: "main" });
							}}>
							View anime information
						</ContextMenuItem>
						<ContextMenuItem
							disabled={!menuRow?.infoLink}
							onClick={() => {
								if (!menuRow?.infoLink) {
									return;
								}
								void desktopRpc.request.openExternal({
									url: menuRow.infoLink,
								});
							}}>
							View torrent information
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
							Discard
						</ContextMenuItem>
						<ContextMenuSub>
							<ContextMenuSubTrigger disabled={!menuOnList}>Quick filters</ContextMenuSubTrigger>
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
									Discard all torrents for this anime
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
									Select this fansub group for this anime
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
							Search for more torrents with this title
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
							Search for anime with this title
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			</ScrollArea>
		</div>
	);
}
