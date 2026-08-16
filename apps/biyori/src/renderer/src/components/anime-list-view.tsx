import { useEffect, useRef, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/mainview/components/ui/tabs";
import { Progress } from "@/mainview/components/ui/progress";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { TableRow } from "@/mainview/components/ui/table";
import { DataTable } from "@/mainview/components/data-table";
import { AnimeItemCommands } from "@/mainview/components/anime-item-commands";
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
import { trpc } from "@/mainview/trpc";
import { listStatusSchema, type ListStatus } from "@/shared/list";
import { cn } from "@/mainview/lib/utils";
import {
	setSelectedAnime,
	requestAnimeDelete,
	useSelectedAnime,
	setOrderedAnimeIds,
	type SelectedAnime,
} from "@/mainview/lib/selected-anime";
import { desktopRpc } from "@/desktop-rpc";
import { AiringStatusMark } from "@/mainview/lib/airing-status";
import { formatTimeAgo } from "@/mainview/lib/format-date";
import { useListFilterText } from "@/mainview/lib/list-filter";
import { animeMatchesListFilter } from "@/mainview/lib/anime-list-filter";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/shared/app-router";

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

const columns: ColumnDef<AnimeRow>[] = [
	{
		id: "airingStatus",
		accessorKey: "airingStatus",
		header: "",
		enableSorting: true,
		meta: { className: "w-8 min-w-8 max-w-8 px-2" },
		cell: ({ row }) => (
			<div className="flex justify-center">
				<AiringStatusMark
					status={row.original.airingStatus}
					shape="square"
				/>
			</div>
		),
	},
	{
		accessorKey: "title",
		header: "Anime title",
		cell: ({ row }) => (
			<span className="max-w-0 truncate font-medium text-primary">
				{row.original.title}
			</span>
		),
	},
	{
		id: "progress",
		accessorFn: (row) =>
			row.episodes > 0 ? row.episodesWatched / row.episodes : 0,
		header: "Progress",
		cell: ({ row }) => {
			const total = row.original.episodes;
			const watched = row.original.episodesWatched;
			const available = row.original.availableEpisode;
			const aired = row.original.lastAiredEpisode;
			const percent =
				total > 0 ? Math.round((watched / total) * 100) : 0;
			const parts = [String(watched)];
			if (available > 0) {
				parts.push(String(available));
			}
			if (aired > 0 && aired !== available) {
				parts.push(`${aired} aired`);
			}
			parts.push(String(total));
			return (
				<div className="flex items-center gap-2">
					<Progress
						value={percent}
						className="w-24 [&_[data-slot=progress-indicator]]:bg-success"
					/>
					<span className="text-xs tabular-nums text-muted-foreground">
						{parts.join("/")}
					</span>
				</div>
			);
		},
	},
	{
		accessorKey: "score",
		header: "Score",
		cell: ({ row }) => (
			<span className="text-right tabular-nums">
				{row.original.score ? `${row.original.score}%` : "-"}
			</span>
		),
	},
	{
		accessorKey: "averageScore",
		header: "Average",
		cell: ({ row }) => (
			<span className="text-right tabular-nums">{row.original.averageScore}%</span>
		),
	},
	{ accessorKey: "type", header: "Type" },
	{ accessorKey: "season", header: "Season" },
	{
		accessorKey: "started",
		header: "Started",
		cell: ({ row }) => row.original.started ?? "-",
	},
	{
		accessorKey: "completed",
		header: "Completed",
		cell: ({ row }) => row.original.completed ?? "-",
	},
	{
		accessorKey: "lastUpdated",
		header: "Last updated",
		cell: ({ row }) => (
			<span className="text-muted-foreground">
				{formatTimeAgo(row.original.lastUpdated)}
			</span>
		),
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
	const listQuery = trpc.anime.list.useQuery(
		{ status: tab },
		{ placeholderData: keepPreviousData },
	);
	const countsQuery = trpc.anime.counts.useQuery();
	const scan = trpc.library.scan.useMutation();
	const playNext = trpc.library.playNext.useMutation();
	const playRandom = trpc.library.playRandom.useMutation();
	const selected = useSelectedAnime();
	const listFilter = useListFilterText();
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "lastUpdated", desc: true },
	]);
	const [menuRow, setMenuRow] = useState<AnimeRow | null>(null);
	const table = useReactTable({
		data: listQuery.data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => String(row.id),
		globalFilterFn: (row, _columnId, filterValue) =>
			animeMatchesListFilter(row.original, String(filterValue ?? "")),
		onSortingChange: setSorting,
		state: { sorting, globalFilter: listFilter },
	});
	const tableRef = useRef(table);
	tableRef.current = table;
	const selectedRef = useRef(selected);
	selectedRef.current = selected;

	const filteredRows = table.getFilteredRowModel().rows;
	const visualIds = filteredRows.map((row) => row.original.id);
	const visualIdsKey = visualIds.join("\0");

	function selectRow(row: AnimeRow) {
		setSelectedAnime(toSelected(row, tab));
	}

	useEffect(() => {
		setOrderedAnimeIds(visualIds);
	}, [visualIdsKey]);

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
		<div className="flex h-full min-h-0 flex-col">
			<Tabs
				value={tab}
				onValueChange={(value) => {
					onTabChange(value as ListStatus);
				}}
				className="flex h-full min-h-0 flex-col gap-0"
			>
				<div className="shrink-0 border-b bg-card px-2 pt-2">
					<TabsList className="h-auto bg-transparent p-0">
						{tabs.map((item) => (
							<TabsTrigger
								key={item}
								value={item}
								className="rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-3 py-2 text-sm data-active:border-primary data-active:bg-transparent data-active:shadow-none"
							>
								{item} ({countsQuery.data?.[item] ?? 0})
							</TabsTrigger>
						))}
					</TabsList>
				</div>

				<TabsContent value={tab} className="m-0 min-h-0 flex-1">
					<ContextMenu>
						<ContextMenuTrigger className="block h-full min-h-0">
							<ScrollArea className="h-full">
							{listQuery.isLoading && !listQuery.data ? (
								<div className="flex flex-col gap-2 p-4">
									<Skeleton className="h-8 w-full" />
									<Skeleton className="h-8 w-full" />
									<Skeleton className="h-8 w-full" />
								</div>
							) : null}
							{listQuery.error ? (
								<Empty>
									<EmptyTitle>Could not load list</EmptyTitle>
									<EmptyDescription>
										{listQuery.error.message}
									</EmptyDescription>
								</Empty>
							) : null}
							{listQuery.data && listQuery.data.length === 0 ? (
								<Empty>
									<EmptyTitle>No anime</EmptyTitle>
									<EmptyDescription>
										Nothing in this list yet.
									</EmptyDescription>
								</Empty>
							) : null}
							{listQuery.data &&
							listQuery.data.length > 0 &&
							filteredRows.length === 0 ? (
								<Empty>
									<EmptyTitle>No matches</EmptyTitle>
									<EmptyDescription>
										Nothing matched the list filter.
									</EmptyDescription>
								</Empty>
							) : null}
							{filteredRows.length > 0 ? (
								<DataTable
									table={table}
									renderRow={(row, cells) => (
										<TableRow
											data-state={
												selected?.id === row.original.id
													? "selected"
													: undefined
											}
											className={cn(
												"cursor-pointer",
												row.original.availableEpisode >
													row.original.episodesWatched &&
													"bg-primary/8",
											)}
											onClick={() => {
												selectRow(row.original);
												onOpenAnime(row.original.id, "main");
											}}
											onContextMenu={() => {
												selectRow(row.original);
												setMenuRow(row.original);
											}}
										>
											{cells}
										</TableRow>
									)}
								/>
							) : null}
							</ScrollArea>
						</ContextMenuTrigger>
						<ContextMenuContent className="min-w-56">
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
