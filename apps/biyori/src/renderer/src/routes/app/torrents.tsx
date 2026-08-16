import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type RowSelectionState,
	type SortingState,
} from "@tanstack/react-table";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
import { TableRow } from "@/mainview/components/ui/table";
import { DataTable } from "@/mainview/components/data-table";
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
import { desktopRpc } from "@/desktop-rpc";
import { AiringStatusMark } from "@/mainview/lib/airing-status";
import { formatLocalDateTime } from "@/mainview/lib/format-date";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/shared/app-router";

export const Route = createFileRoute("/app/torrents")({
	validateSearch: animeInfoSearchSchema,
	component: TorrentsPage,
});

type TorrentRow = inferRouterOutputs<AppRouter>["torrents"]["list"][number];

function countLabel(value: number | null): string {
	return value == null ? "-" : String(value);
}

function TorrentsPage() {
	const query = trpc.torrents.list.useQuery();
	const utils = trpc.useUtils();
	const navigate = useNavigate();
	const animeInfo = useAnimeInfoNav();
	const setFansub = trpc.anime.setFansub.useMutation();
	const refresh = trpc.torrents.refresh.useMutation({
		onSuccess: (next) => {
			utils.torrents.list.setData(undefined, next);
		},
	});
	const searchFeed = trpc.torrents.search.useMutation({
		onSuccess: (next) => {
			utils.torrents.list.setData(undefined, next);
		},
	});
	const download = trpc.torrents.download.useMutation();
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
	const items = query.data ?? [];
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [menuRow, setMenuRow] = useState<TorrentRow | null>(null);

	const columns: ColumnDef<TorrentRow>[] = [
		{
			id: "select",
			enableSorting: false,
			meta: { className: "w-8 min-w-8 max-w-8" },
			header: ({ table }) => (
				<Checkbox
					aria-label="Select all torrents"
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
			cell: ({ row }) => (
				<div className="flex min-w-40 max-w-72 items-center gap-2">
					<AiringStatusMark
						status={row.original.matched ? row.original.airingStatus || null : null}
						shape="dot"
					/>
					<span className="truncate font-medium">{row.original.animeTitle}</span>
				</div>
			),
		},
		{
			accessorKey: "episode",
			header: "Episode",
			cell: ({ row }) => (
				<span
					className={
						row.original.matched && row.original.episode != null
							? "tabular-nums text-blue-600 dark:text-blue-400"
							: "tabular-nums text-muted-foreground"
					}
				>
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
			cell: ({ row }) => (
				<span className="tabular-nums">{row.original.size || "-"}</span>
			),
		},
		{
			accessorKey: "videoFormat",
			header: "Video",
			cell: ({ row }) => row.original.videoFormat || "-",
		},
		{
			accessorKey: "seeders",
			header: "S",
			cell: ({ row }) => (
				<span className="tabular-nums">{countLabel(row.original.seeders)}</span>
			),
		},
		{
			accessorKey: "leechers",
			header: "L",
			cell: ({ row }) => (
				<span className="tabular-nums">{countLabel(row.original.leechers)}</span>
			),
		},
		{
			accessorKey: "downloads",
			header: "D",
			cell: ({ row }) => (
				<span className="tabular-nums">{countLabel(row.original.downloads)}</span>
			),
		},
		{
			accessorKey: "description",
			header: "Description",
			cell: ({ row }) => (
				<span className="block max-w-56 truncate text-muted-foreground" title={row.original.description}>
					{row.original.description || "-"}
				</span>
			),
		},
		{
			accessorKey: "filename",
			header: "Filename",
			cell: ({ row }) => (
				<span className="block max-w-72 truncate" title={row.original.filename}>
					{row.original.filename || row.original.title}
				</span>
			),
		},
		{
			accessorKey: "pubDate",
			header: "Release date",
			cell: ({ row }) => (
				<span className="tabular-nums">
					{formatLocalDateTime(row.original.pubDate)}
				</span>
			),
		},
	];

	const table = useReactTable({
		data: items,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => row.guid,
		enableRowSelection: true,
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		state: { sorting, rowSelection },
	});

	const selected = table.getSelectedRowModel().rows;
	const menuOnList = Boolean(menuRow?.matched && menuRow.animeId != null);

	function applyList(next: TorrentRow[]): void {
		utils.torrents.list.setData(undefined, next);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex shrink-0 justify-end gap-2 border-b px-3 py-2">
				<Button
					variant="outline"
					size="sm"
					disabled={selected.length === 0 || download.isPending}
					onClick={() => {
						for (const row of selected) {
							void download.mutateAsync({ guid: row.original.guid });
						}
					}}
				>
					Download marked torrents
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={selected.length === 0}
					onClick={() => {
						let next = items;
						for (const row of selected) {
							next = next.filter((item) => item.guid !== row.original.guid);
							void discard.mutateAsync({ guid: row.original.guid });
						}
						setRowSelection({});
					}}
				>
					Discard all
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={refresh.isPending}
					onClick={() => {
						void refresh.mutateAsync();
					}}
				>
					Check new torrents
				</Button>
			</div>
			<ScrollArea className="h-full flex-1">
				{query.isPending && items.length === 0 ? (
					<TableRowsSkeleton columnCount={columns.length} />
				) : null}
				{items.length === 0 && !query.isLoading ? (
					<Empty>
						<EmptyTitle>No torrents found</EmptyTitle>
						<EmptyDescription>
							Matching torrents for your list will be listed here.
						</EmptyDescription>
					</Empty>
				) : null}
				{items.length > 0 ? (
					<ContextMenu>
						<ContextMenuTrigger className="block h-full min-h-0">
							<DataTable
								table={table}
								renderRow={(row, cells) => (
									<TableRow
										data-state={row.getIsSelected() ? "selected" : undefined}
										className={cn(
											"cursor-pointer",
											!row.original.matched &&
												"text-muted-foreground **:text-muted-foreground! [&_.text-blue-400]:text-muted-foreground! [&_.text-blue-600]:text-muted-foreground! [&_.text-primary]:text-muted-foreground!",
										)}
										onClick={() => {
											row.toggleSelected();
										}}
										onContextMenu={() => {
											setMenuRow(row.original);
										}}
									>
										{cells}
									</TableRow>
								)}
							/>
						</ContextMenuTrigger>
						<ContextMenuContent className="min-w-64">
							<ContextMenuItem
								className="font-semibold"
								disabled={!menuRow?.link}
								onClick={() => {
									if (!menuRow) {
										return;
									}
									void download.mutateAsync({ guid: menuRow.guid });
								}}
							>
								Download torrent
							</ContextMenuItem>
							<ContextMenuItem
								disabled={!menuOnList}
								onClick={() => {
									if (!menuRow?.animeId) {
										return;
									}
									animeInfo.open({ id: menuRow.animeId, infoTab: "main" });
								}}
							>
								View anime information
							</ContextMenuItem>
							<ContextMenuItem
								disabled={!menuRow?.link}
								onClick={() => {
									if (!menuRow?.link) {
										return;
									}
									void desktopRpc.request.openExternal({
										url: menuRow.link,
									});
								}}
							>
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
								}}
							>
								Discard
							</ContextMenuItem>
							<ContextMenuSub>
								<ContextMenuSubTrigger disabled={!menuOnList}>
									Quick filters
								</ContextMenuSubTrigger>
								<ContextMenuSubContent className="min-w-72">
									<ContextMenuItem
										disabled={!menuOnList}
										onClick={() => {
											if (!menuRow?.animeId) {
												return;
											}
											void discardAnime.mutateAsync({
												animeId: menuRow.animeId,
											});
										}}
									>
										Discard all torrents for this anime
									</ContextMenuItem>
									<ContextMenuItem
										disabled={!menuOnList || !menuRow?.group}
										onClick={() => {
											if (!menuRow?.animeId || !menuRow.group) {
												return;
											}
											void setFansub
												.mutateAsync({
													id: menuRow.animeId,
													fansub: menuRow.group,
												})
												.then(async () => {
													void utils.anime.list.invalidate();
													for (const item of items) {
														if (
															item.animeId === menuRow.animeId &&
															item.group !== menuRow.group
														) {
															applyList(
																await discard.mutateAsync({ guid: item.guid }),
															);
														}
													}
												});
										}}
									>
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
								}}
							>
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
								}}
							>
								Search for anime with this title
							</ContextMenuItem>
						</ContextMenuContent>
					</ContextMenu>
				) : null}
			</ScrollArea>
		</div>
	);
}
