import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
	getCoreRowModel,
	getExpandedRowModel,
	getGroupedRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table";
import { ListIcon, ListPlusIcon, SearchIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
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
import { formatSeasonLabel } from "@/mainview/lib/season-view";
import { AiringStatusMark } from "@/mainview/lib/airing-status";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { listStatusSchema, type ListStatus } from "@/shared/list";
import { trpc } from "@/mainview/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/shared/app-router";
import { anilistSearchRouteSchema } from "@/lib/schemas/anilist-search";

export const Route = createFileRoute("/app/search")({
	validateSearch: anilistSearchRouteSchema,
	component: SearchPage,
});

type SearchItem = inferRouterOutputs<AppRouter>["anilist"]["search"]["items"][number];
type SearchRow = SearchItem & { inList: boolean };

const columns: ColumnDef<SearchRow>[] = [
	{
		id: "inList",
		accessorFn: (row) => (row.inList ? "inlist" : "notinlist"),
		header: "",
		enableSorting: false,
	},
	{
		accessorKey: "title",
		header: "Anime title",
		cell: ({ row }) => (
			<div className="flex min-w-0 items-center gap-2">
				<AiringStatusMark status={row.original.status} shape="square" />
				<span className="min-w-0 truncate font-medium text-primary">
					{row.original.title}
				</span>
			</div>
		),
	},
	{
		accessorKey: "format",
		header: "Type",
	},
	{
		accessorKey: "episodes",
		header: "Episodes",
		cell: ({ row }) => (
			<span className="tabular-nums">
				{row.original.episodes > 0 ? row.original.episodes : "-"}
			</span>
		),
	},
	{
		accessorKey: "averageScore",
		header: "Score",
		cell: ({ row }) => (
			<span className="tabular-nums">
				{row.original.averageScore > 0
					? `${row.original.averageScore}%`
					: "-"}
			</span>
		),
	},
	{
		id: "season",
		accessorFn: (row) => formatSeasonLabel(row.season, row.seasonYear),
		header: "Season",
		cell: ({ row }) =>
			formatSeasonLabel(row.original.season, row.original.seasonYear) ||
			"-",
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

function parseListStatus(value: string | undefined): ListStatus | null {
	if (!value) {
		return null;
	}
	const parsed = listStatusSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}

function SearchPage() {
	const { q, id: openId } = Route.useSearch();
	const animeInfo = useAnimeInfoNav();
	const query = trpc.anilist.search.useQuery(
		{ q, page: 1 },
		{ enabled: (q ?? "").trim().length > 0 },
	);
	const listedQuery = trpc.anime.listed.useQuery();
	const listedById = new Map(
		(listedQuery.data ?? []).map((row) => [row.id, row.status]),
	);
	const items = [...(query.data?.items ?? [])]
		.map((item) => ({
			...item,
			inList: listedById.has(item.id),
		}))
		.sort((left, right) => Number(right.inList) - Number(left.inList));
	const [sorting, setSorting] = useState<SortingState>([]);
	const [menuRow, setMenuRow] = useState<SearchRow | null>(null);
	const table = useReactTable({
		data: items,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getGroupedRowModel: getGroupedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowId: (row) => String(row.id),
		groupedColumnMode: "remove",
		onSortingChange: setSorting,
		state: {
			sorting,
			grouping: ["inList"],
			expanded: true,
		},
	});
	const hasQuery = (q ?? "").trim().length > 0;
	const menuStatus = menuRow
		? parseListStatus(listedById.get(menuRow.id))
		: null;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<ContextMenu>
				<ContextMenuTrigger className="block h-full min-h-0">
					<ScrollArea className="h-full">
						{!hasQuery ? (
							<Empty>
								<SearchIcon className="size-8 text-muted-foreground" />
								<EmptyTitle>Search AniList</EmptyTitle>
								<EmptyDescription>
									Type a title in the toolbar and press Enter.
								</EmptyDescription>
							</Empty>
						) : null}
						{hasQuery && query.isPending && items.length === 0 ? (
							<TableRowsSkeleton columnCount={columns.length} />
						) : null}
						{query.error ? (
							<Empty>
								<EmptyTitle>Search failed</EmptyTitle>
								<EmptyDescription>{query.error.message}</EmptyDescription>
							</Empty>
						) : null}
						{hasQuery &&
						!query.isPending &&
						!query.error &&
						items.length === 0 ? (
							<Empty>
								<EmptyTitle>No results</EmptyTitle>
								<EmptyDescription>
									Nothing matched "{q}".
								</EmptyDescription>
							</Empty>
						) : null}
						{items.length > 0 ? (
							<DataTable
								table={table}
								groupLabel={(value) =>
									value === "inlist" ? (
										<span className="inline-flex items-center gap-2">
											<ListIcon className="size-4" />
											In list
										</span>
									) : (
										<span className="inline-flex items-center gap-2">
											<ListPlusIcon className="size-4" />
											Not in list
										</span>
									)
								}
								renderRow={(row, cells) => (
									<TableRow
										data-state={
											openId === row.original.id ? "selected" : undefined
										}
										className="cursor-pointer"
										onClick={() => {
											animeInfo.open({
												id: row.original.id,
												infoTab: "main",
											});
										}}
										onContextMenu={() => {
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
					{menuRow ? (
						<AnimeItemCommands
							parts={commandParts}
							mode="discover"
							discover={{
								id: menuRow.id,
								title: menuRow.title,
								episodes: menuRow.episodes,
								trailerId: menuRow.trailerId,
								listStatus: menuStatus,
							}}
							onInformation={() => {
								animeInfo.open({ id: menuRow.id, infoTab: "main" });
							}}
						/>
					) : null}
				</ContextMenuContent>
			</ContextMenu>
		</div>
	);
}
