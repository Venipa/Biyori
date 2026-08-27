import { AiringStatusMark } from "@/components/airing-status";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { desktopRpc } from "@/desktop-rpc";
import { AnimeItemCommands } from "@/mainview/components/anime-item-commands";
import { AnimeListProgress } from "@/mainview/components/anime-list-progress";
import { DataTable } from "@/mainview/components/data-table";
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
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { TableRow } from "@/mainview/components/ui/table";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
import { animeMatchesListFilter } from "@/mainview/lib/anime-list-filter";
import { formatLocalDateTime, formatTimeAgo } from "@/mainview/lib/format-date";
import { useListFilterText } from "@/mainview/lib/list-filter";
import { libraryEpisodeTooltip, listProgressRatio } from "@/mainview/lib/list-progress";
import { requestAnimeDelete, type SelectedAnime, setOrderedAnimeIds, setSelectedAnime, useSelectedAnime } from "@/mainview/lib/selected-anime";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { type ListStatus, listStatusSchema } from "@/shared/list";
import { keepPreviousData } from "@tanstack/react-query";
import { type ColumnDef, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type SortingState, useReactTable } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { PlayIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

const tabs = listStatusSchema.options;

type AnimeRow = inferRouterOutputs<AppRouter>["anime"]["list"][number];
export type AnimeInfoTab = "main" | "list";

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

function ListTip({ tip, className, children }: { tip: string; className?: string; children: ReactNode }) {
	if (!tip) {
		return children;
	}
	return (
		<Tooltip>
			<TooltipTrigger delay={400} render={<span className={cn("block min-w-0", className)} />}>
				{children}
			</TooltipTrigger>
			<TooltipContent className='whitespace-pre-line'>{tip}</TooltipContent>
		</Tooltip>
	);
}

function PlayingOrAiringCell({ playing, status }: { playing: boolean; status: string | null | undefined }) {
	const tip = playing ? "Now playing" : status?.trim() || "Unknown";
	return (
		<ListTip tip={tip} className='flex justify-center'>
			{playing ? <PlayIcon className='size-3.5 fill-current text-success' aria-label='Now playing' /> : <AiringStatusMark status={status} shape='square' nativeTitle={false} />}
		</ListTip>
	);
}

const columns: ColumnDef<AnimeRow>[] = [
	{
		id: "airingStatus",
		accessorKey: "airingStatus",
		header: "",
		enableSorting: true,
		meta: { className: "w-8 min-w-8 max-w-8 px-2" },
		cell: ({ row, table }) => <PlayingOrAiringCell playing={table.options.meta?.playingId === row.original.id} status={row.original.airingStatus} />,
	},
	{
		accessorKey: "title",
		header: "Anime title",
		meta: { className: "w-full max-w-0" },
		cell: ({ row }) => {
			const nextAvailable = !!row.original.libraryEpisodes?.includes(row.original.episodesWatched + 1);
			return (
				<ListTip
					tip={row.original.title}
					className={cn("truncate font-medium", nextAvailable ? "text-primary" : "text-foreground", "[tr[data-playing]_&]:font-semibold [tr[data-playing]_&]:text-inherit")}>
					{row.original.title}
				</ListTip>
			);
		},
	},
	{
		id: "progress",
		accessorFn: (row) => listProgressRatio(row.episodesWatched, row.episodes),
		header: "Progress",
		meta: { className: "min-w-[10rem]" },
		cell: ({ row }) => {
			const finished = row.original.airingStatus === "Finished airing" || row.original.airingStatus === "Finished";
			return (
				<ListTip
					tip={libraryEpisodeTooltip({
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
				</ListTip>
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
				<ListTip tip={absolute === "-" ? "" : absolute}>
					<span className='text-muted-foreground'>{formatTimeAgo(row.original.lastUpdated)}</span>
				</ListTip>
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
	tab: ListStatus;
	openAnimeId: number | undefined;
	onTabChange: (tab: ListStatus) => void;
	onOpenAnime: (id: number, infoTab?: AnimeInfoTab) => void;
}) {
	const listQuery = trpc.anime.list.useQuery({ status: tab }, { placeholderData: keepPreviousData });
	const countsQuery = trpc.anime.counts.useQuery();
	const playingId =
		trpc.media.nowPlaying.useQuery(undefined, {
			select: (snapshot) => snapshot?.match?.id ?? null,
		}).data ?? null;
	const scan = trpc.library.scan.useMutation();
	const playNext = trpc.library.playNext.useMutation();
	const playRandom = trpc.library.playRandom.useMutation();
	const selected = useSelectedAnime();
	const listFilter = useListFilterText();
	const [sorting, setSorting] = useState<SortingState>([{ id: "lastUpdated", desc: true }]);
	const [menuRow, setMenuRow] = useState<AnimeRow | null>(null);
	const table = useReactTable({
		data: listQuery.data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => String(row.id),
		globalFilterFn: (row, _columnId, filterValue) => animeMatchesListFilter(row.original, String(filterValue ?? "")),
		onSortingChange: setSorting,
		state: { sorting, globalFilter: listFilter },
		meta: { playingId },
	});
	const tableRef = useRef(table);
	tableRef.current = table;
	const selectedRef = useRef(selected);
	selectedRef.current = selected;

	const filteredRows = table.getFilteredRowModel().rows;
	const visualIds = filteredRows.map((row) => row.original.id);
	const _visualIdsKey = visualIds.join("\0");

	function selectRow(row: AnimeRow) {
		setSelectedAnime(toSelected(row, tab));
	}

	useEffect(() => {
		setOrderedAnimeIds(visualIds);
	}, [visualIds]);

	useEffect(() => {
		if (!openAnimeId || !listQuery.data) {
			return;
		}
		const openRow = listQuery.data.find((row) => row.id === openAnimeId);
		if (openRow && selected?.id !== openAnimeId) {
			setSelectedAnime(toSelected(openRow, tab));
		}
	}, [openAnimeId, listQuery.data, selected?.id, tab]);

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
				requestAnimeDelete(toSelected(row, tab));
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
	}, [tab, scan, playNext, playRandom]);

	const menuAnime = menuRow ? toSelected(menuRow, tab) : null;

	return (
		<TooltipProvider delay={400}>
			<div className='flex h-full min-h-0 flex-col'>
				<Tabs
					value={tab}
					onValueChange={(value) => {
						onTabChange(value as ListStatus);
					}}
					className='flex h-full min-h-0 flex-col gap-0'>
					<div className='shrink-0 border-b bg-card px-2 pt-2'>
						<TabsList className='h-auto bg-transparent p-0'>
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
									{listQuery.error ? (
										<Empty>
											<EmptyTitle>Could not load list</EmptyTitle>
											<EmptyDescription>{listQuery.error.message}</EmptyDescription>
										</Empty>
									) : null}
									{listQuery.data && listQuery.data.length === 0 ? (
										<Empty>
											<EmptyTitle>No anime</EmptyTitle>
											<EmptyDescription>Nothing in this list yet.</EmptyDescription>
										</Empty>
									) : null}
									{listQuery.data && listQuery.data.length > 0 && filteredRows.length === 0 ? (
										<Empty>
											<EmptyTitle>No matches</EmptyTitle>
											<EmptyDescription>Nothing matched the list filter.</EmptyDescription>
										</Empty>
									) : null}
									{filteredRows.length > 0 ? (
										<DataTable
											table={table}
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
		</TooltipProvider>
	);
}
