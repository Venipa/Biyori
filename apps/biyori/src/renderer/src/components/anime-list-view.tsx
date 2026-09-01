import { AiringStatusMark } from "@/components/airing-status";
import { Badge } from "@/components/ui/badge";
import { desktopRpc } from "@/desktop-rpc";
import { AnimeItemCommands } from "@/mainview/components/anime-item-commands";
import { AnimeListProgress } from "@/mainview/components/anime-list-progress";
import { DataTable, resizableTableOptions } from "@/mainview/components/data-table";
import { PlaceholderView } from "@/mainview/components/placeholder-view";
import { Button } from "@/mainview/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/mainview/components/ui/context-menu";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { TableRow } from "@/mainview/components/ui/table";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
import { animeMatchesListFilter } from "@/mainview/lib/anime-list-filter";
import { formatLocalDateTime, formatTimeAgo } from "@/mainview/lib/format-date";
import { clearListFilterText, useListFilterText } from "@/mainview/lib/list-filter";
import { libraryEpisodeTooltip, listProgressRatio } from "@/mainview/lib/list-progress";
import { requestAnimeDelete, type SelectedAnime, setOrderedAnimeIds, setSelectedAnime, useSelectedAnime } from "@/mainview/lib/selected-anime";
import { usePersistedColumnSizing } from "@/mainview/lib/table-column-sizing";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { ANIME_LIST_SEARCH_TAB, type AnimeListTab, type ListStatus, listStatusSchema } from "@/shared/list";
import { log } from "@biyori/logger";
import { type ColumnDef, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type SortingState, useReactTable } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { CircleAlertIcon, FilterIcon, ListIcon, PlayIcon, XIcon } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";

const tabs = listStatusSchema.options;

type AnimeRow = inferRouterOutputs<AppRouter>["anime"]["list"][number];
export type AnimeInfoTab = "main" | "list";
const EMPTY_ROWS: AnimeRow[] = [];

function toSelected(row: AnimeRow, status: ListStatus): SelectedAnime {
	return {
		id: row.id,
		title: row.title,
		folder: row.folder,
		episodes: row.episodes,
		episodesWatched: row.episodesWatched,
		status,
		notes: row.notes ?? "",
	};
}

function listStatusFallback(tab: AnimeListTab): ListStatus {
	return tab === ANIME_LIST_SEARCH_TAB ? "Currently watching" : tab;
}

function rowListStatus(row: AnimeRow, fallback: ListStatus): ListStatus {
	const parsed = listStatusSchema.safeParse(row.status);
	return parsed.success ? parsed.data : fallback;
}

function PlayingOrAiringCell({ playing, status }: { playing: boolean; status: string | null | undefined }) {
	if (playing) {
		return (
			<span className='flex justify-center' title='Now playing'>
				<PlayIcon className='size-3.5 fill-current text-success' aria-label='Now playing' />
			</span>
		);
	}
	return (
		<span className='flex justify-center'>
			<AiringStatusMark status={status} shape='square' />
		</span>
	);
}

const columns: ColumnDef<AnimeRow>[] = [
	{
		id: "airingStatus",
		accessorKey: "airingStatus",
		header: () => <span className='sr-only'>Airing status</span>,
		enableSorting: true,
		enableResizing: false,
		size: 32,
		minSize: 32,
		maxSize: 32,
		meta: { className: "px-2" },
		cell: ({ row, table }) => <PlayingOrAiringCell playing={table.options.meta?.playingId === row.original.id} status={row.original.airingStatus} />,
	},
	{
		accessorKey: "title",
		header: "Anime title",
		size: 280,
		minSize: 120,
		meta: { className: "min-w-0" },
		cell: ({ row }) => {
			const nextAvailable = !!row.original.libraryEpisodes?.includes(row.original.episodesWatched + 1);
			return (
				<span
					title={row.original.title}
					className={cn(
						"block min-w-0 truncate font-medium text-sm",
						nextAvailable ? "text-primary" : "text-foreground",
						"[tr[data-playing]_&]:font-semibold [tr[data-playing]_&]:text-inherit",
					)}>
					{row.original.title}
				</span>
			);
		},
	},
	{
		id: "progress",
		accessorFn: (row) => listProgressRatio(row.episodesWatched, row.episodes),
		header: "Progress",
		size: 180,
		minSize: 120,
		cell: ({ row }) => {
			const finished = row.original.airingStatus === "Finished airing" || row.original.airingStatus === "Finished";
			return (
				<span
					className='block min-w-0'
					title={libraryEpisodeTooltip({
						watched: row.original.episodesWatched,
						total: row.original.episodes,
						aired: row.original.lastAiredEpisode,
						finished,
						libraryEpisodes: row.original.libraryEpisodes,
					})}>
					<AnimeListProgress
						watched={row.original.episodesWatched}
						total={row.original.episodes}
						available={row.original.availableEpisode}
						aired={row.original.lastAiredEpisode}
						finished={finished}
						status={(row.original.status as ListStatus) ?? "Currently watching"}
					/>
				</span>
			);
		},
	},
	{
		accessorKey: "score",
		header: "Score",
		cell: ({ row }) => (
			<span className={cn("text-right tabular-nums", row.original.score ? undefined : "text-muted-foreground")}>{row.original.score ? `${row.original.score}%` : "-"}</span>
		),
	},
	{
		accessorKey: "averageScore",
		header: "Average",
		cell: ({ row }) => <span className={cn("text-right tabular-nums", row.original.averageScore ? undefined : "text-muted-foreground")}>{row.original.averageScore}%</span>,
	},
	{ accessorKey: "type", header: "Type", cell: ({ row }) => <span className={row.original.type ? undefined : "text-muted-foreground"}>{row.original.type || "-"}</span> },
	{
		accessorKey: "season",
		header: "Season",
		cell: ({ row }) => <span className={row.original.season ? undefined : "text-muted-foreground"}>{row.original.season || "-"}</span>,
	},
	{
		accessorKey: "started",
		header: "Started",
		cell: ({ row }) => <span className={row.original.started ? undefined : "text-muted-foreground"}>{row.original.started ?? "-"}</span>,
	},
	{
		accessorKey: "completed",
		header: "Completed",
		cell: ({ row }) => <span className={row.original.completed ? undefined : "text-muted-foreground"}>{row.original.completed ?? "-"}</span>,
	},
	{
		accessorKey: "lastUpdated",
		header: "Last updated",
		cell: ({ row }) => {
			const absolute = formatLocalDateTime(row.original.lastUpdated);
			return (
				<span className='text-muted-foreground' title={absolute === "-" ? undefined : absolute}>
					{formatTimeAgo(row.original.lastUpdated)}
				</span>
			);
		},
	},
];

const commandParts = {
	Item: ContextMenuItem,
	Sub: ContextMenuSub,
	SubTrigger: ContextMenuSubTrigger,
	SubContent: ContextMenuSubContent,
	Separator: ContextMenuSeparator,
	Shortcut: ContextMenuShortcut,
};

export function AnimeListView({
	tab,
	openAnimeId,
	onTabChange,
	onOpenAnime,
}: {
	tab: AnimeListTab;
	openAnimeId: number | undefined;
	onTabChange: (tab: AnimeListTab) => void;
	onOpenAnime: (id: number, infoTab?: AnimeInfoTab) => void;
}) {
	const listFilter = useListFilterText();
	const searching = listFilter.trim().length > 0;
	const onSearchTab = tab === ANIME_LIST_SEARCH_TAB;
	const groupedSearch = searching && onSearchTab;
	const statusFallback = listStatusFallback(tab);
	const lastListTab = useRef<ListStatus>(statusFallback);
	const wasSearching = useRef(searching);
	if (tab !== ANIME_LIST_SEARCH_TAB) {
		lastListTab.current = tab;
	}
	const listStatus = onSearchTab ? lastListTab.current : statusFallback;
	const utils = trpc.useUtils();
	const listQuery = trpc.anime.list.useQuery(groupedSearch ? {} : { status: listStatus }, {
		placeholderData: (previousData) => {
			if (!previousData) {
				return previousData;
			}
			if (groupedSearch) {
				return previousData;
			}
			return previousData.filter((row) => row.status === listStatus);
		},
	});
	const countsQuery = trpc.anime.counts.useQuery();
	const playingId =
		trpc.media.nowPlaying.useQuery(undefined, {
			select: (snapshot) => snapshot?.match?.id ?? null,
		}).data ?? null;
	const scan = trpc.library.scan.useMutation();
	const playNext = trpc.library.playNext.useMutation();
	const playRandom = trpc.library.playRandom.useMutation();
	const selected = useSelectedAnime();
	const [sorting, setSorting] = useState<SortingState>([{ id: "lastUpdated", desc: true }]);
	const [menuRow, setMenuRow] = useState<AnimeRow | null>(null);
	const { columnSizing, onColumnSizingChange } = usePersistedColumnSizing("anime-list");
	const table = useReactTable({
		data: listQuery.data ?? EMPTY_ROWS,
		columns,
		...resizableTableOptions,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => String(row.id),
		globalFilterFn: (row, _columnId, filterValue) => animeMatchesListFilter(row.original, String(filterValue ?? "")),
		onSortingChange: setSorting,
		onColumnSizingChange,
		state: { sorting, globalFilter: listFilter, columnSizing },
		meta: { playingId },
	});
	const tableRef = useRef(table);
	tableRef.current = table;
	const selectedRef = useRef(selected);
	selectedRef.current = selected;

	const filteredRows = table.getFilteredRowModel().rows;
	const visualIds = groupedSearch
		? tabs.flatMap((status) => filteredRows.filter((row) => row.original.status === status).map((row) => row.original.id))
		: filteredRows.map((row) => row.original.id);
	const visualIdsKey = visualIds.join("\0");

	function selectRow(row: AnimeRow) {
		setSelectedAnime(toSelected(row, rowListStatus(row, statusFallback)));
	}

	useEffect(() => {
		const started = searching && !wasSearching.current;
		wasSearching.current = searching;
		if (started) {
			onTabChange(ANIME_LIST_SEARCH_TAB);
			return;
		}
		if (!searching && tab === ANIME_LIST_SEARCH_TAB) {
			onTabChange(lastListTab.current);
		}
	}, [searching, tab, onTabChange]);

	useEffect(() => {
		setOrderedAnimeIds(visualIdsKey === "" ? [] : visualIdsKey.split("\0").map(Number));
	}, [visualIdsKey]);

	useEffect(() => {
		if (!openAnimeId || !listQuery.data) {
			return;
		}
		const openRow = listQuery.data.find((row) => row.id === openAnimeId);
		if (openRow && selected?.id !== openAnimeId) {
			setSelectedAnime(toSelected(openRow, rowListStatus(openRow, statusFallback)));
		}
	}, [openAnimeId, listQuery.data, selected?.id, statusFallback]);

	useEffect(() => {
		return () => {
			setSelectedAnime(null);
			setOrderedAnimeIds([]);
		};
	}, []);

	useEffect(() => {
		function isTypingTarget(target: EventTarget | null): boolean {
			if (!(target instanceof HTMLElement)) {
				return false;
			}
			return Boolean(
				target.closest(
					"input, textarea, select, [contenteditable=true], [data-slot=select-content], [data-slot=dropdown-menu-content], [data-slot=context-menu-content], [data-slot=alert-dialog-content]",
				),
			);
		}

		function onKeyDown(event: KeyboardEvent) {
			if (isTypingTarget(event.target)) {
				return;
			}
			const current = selectedRef.current;
			const row = tableRef.current
				.getRowModel()
				.rows.map((item) => item.original)
				.find((item) => item.id === current?.id);
			if (!row) {
				return;
			}
			if (event.key === "Delete") {
				event.preventDefault();
				requestAnimeDelete(toSelected(row, rowListStatus(row, statusFallback)));
			}
			if (event.ctrlKey && event.key.toLowerCase() === "o" && row.folder) {
				event.preventDefault();
				void desktopRpc.request.openPath({ path: row.folder });
			}
			if (event.key === "F5") {
				event.preventDefault();
				void scan.mutateAsync();
			}
			if (event.ctrlKey && event.key.toLowerCase() === "n") {
				event.preventDefault();
				void playNext.mutateAsync({
					animeId: row.id,
					episodesWatched: row.episodesWatched,
				});
			}
			if (event.ctrlKey && event.key.toLowerCase() === "r") {
				event.preventDefault();
				void playRandom.mutateAsync({ animeId: row.id });
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [statusFallback, scan, playNext, playRandom]);

	const menuAnime = menuRow ? toSelected(menuRow, rowListStatus(menuRow, statusFallback)) : null;

	return (
		<div className='flex h-full min-h-0 flex-col'>
			<Tabs
				value={tab}
				onValueChange={(value) => {
					onTabChange(value as AnimeListTab);
				}}
				className='flex h-full min-h-0 flex-col gap-0'>
				<div className='shrink-0 border-b bg-card px-2 pt-2'>
					<TabsList className='h-auto bg-transparent p-0'>
						{searching || onSearchTab ? (
							<div className='flex items-center'>
								<TabsTrigger
									value={ANIME_LIST_SEARCH_TAB}
									className='rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-3 py-2 text-sm data-active:border-primary data-active:bg-transparent data-active:shadow-none'>
									Search{" "}
									<Badge variant='outline' size='sm'>
										{filteredRows.length}
									</Badge>
								</TabsTrigger>
								<Button
									type='button'
									variant='ghost'
									size='icon-xs'
									aria-label='Clear search'
									onClick={() => {
										startTransition(() => {
											onTabChange(lastListTab.current);
											clearListFilterText();
										});
									}}>
									<XIcon />
								</Button>
							</div>
						) : null}
						{tabs.map((item) => (
							<TabsTrigger
								key={item}
								value={item}
								className='rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-3 py-2 text-sm data-active:border-primary data-active:bg-transparent data-active:shadow-none'>
								{item} ({countsQuery.data?.[item] ?? 0})
							</TabsTrigger>
						))}
					</TabsList>
				</div>

				<TabsContent value={tab} className='m-0 min-h-0 flex-1'>
					<ContextMenu>
						<ContextMenuTrigger className='block h-full min-h-0'>
							<ScrollArea className='h-full'>
								{listQuery.isPending && !listQuery.data ? <TableRowsSkeleton columnCount={columns.length} /> : null}
								{listQuery.error ? <PlaceholderView icon={CircleAlertIcon} title='Could not load list' description={listQuery.error.message} /> : null}
								{listQuery.data && listQuery.data.length === 0 ? <PlaceholderView icon={ListIcon} title='No anime' description='Nothing in this list yet.' /> : null}
								{listQuery.data && listQuery.data.length > 0 && filteredRows.length === 0 ? (
									<PlaceholderView icon={FilterIcon} title='No matches' description='Nothing matched the list filter.' />
								) : null}
								{filteredRows.length > 0 ? (
									<DataTable
										table={table}
										compact
										groupBy={groupedSearch ? (row) => rowListStatus(row.original, statusFallback) : undefined}
										groupOrder={tabs}
										renderRow={(row, cells) => (
											<TableRow
												data-state={selected?.id === row.original.id ? "selected" : undefined}
												data-playing={row.original.id === playingId ? "true" : undefined}
												className={cn(
													"cursor-pointer even:bg-muted/25",
													row.original.id === playingId
														? "bg-list-playing text-list-playing-foreground even:bg-list-playing hover:bg-list-playing data-[state=selected]:bg-list-playing"
														: null,
												)}
												onClick={() => {
													selectRow(row.original);
													onOpenAnime(row.original.id, "main");
												}}
												onPointerEnter={() => {
													void utils.anime.byId.prefetch({ id: row.original.id }, { staleTime: 30_000 }).then(() => {
														log.debug("prefetch", row.original.id);
													});
												}}
												onContextMenu={() => {
													selectRow(row.original);
													setMenuRow(row.original);
												}}>
												{cells}
											</TableRow>
										)}
									/>
								) : null}
							</ScrollArea>
						</ContextMenuTrigger>
						<ContextMenuContent className='min-w-56'>
							{menuAnime ? (
								<AnimeItemCommands
									parts={commandParts}
									anime={menuAnime}
									onInformation={() => {
										onOpenAnime(menuAnime.id, "main");
									}}
									onEdit={() => {
										onOpenAnime(menuAnime.id, "list");
									}}
									onDelete={() => {
										requestAnimeDelete(menuAnime);
									}}
								/>
							) : null}
						</ContextMenuContent>
					</ContextMenu>
				</TabsContent>
			</Tabs>
		</div>
	);
}
