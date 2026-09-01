import { createFileRoute } from "@tanstack/react-router";
import { type ColumnDef, getCoreRowModel, getSortedRowModel, type SortingState, useReactTable } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { CircleAlertIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { AiringStatusMark } from "@/components/airing-status";
import { anilistSearchRouteSchema } from "@/lib/schemas/anilist-search";
import { parseAnimeInfoId } from "@/lib/schemas/anime-info-search";
import { AnimeItemCommands } from "@/mainview/components/anime-item-commands";
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
import { PlaceholderView } from "@/mainview/components/placeholder-view";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { TableRow } from "@/mainview/components/ui/table";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
import { useAnimeInfoNav, useAnimeInfoOpen } from "@/mainview/lib/anime-info-nav";
import { formatSeasonLabel } from "@/mainview/lib/season-view";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { type ListStatus, listStatusSchema } from "@/shared/list";

export const Route = createFileRoute("/app/search")({
	validateSearch: anilistSearchRouteSchema,
	component: SearchPage,
});

type SearchItem = inferRouterOutputs<AppRouter>["anilist"]["search"]["items"][number];
type SearchRow = SearchItem & { inList: boolean };

const columns: ColumnDef<SearchRow>[] = [
	{
		accessorKey: "title",
		header: "Anime title",
		cell: ({ row }) => (
			<div className='flex min-w-0 items-center gap-2'>
				<AiringStatusMark status={row.original.status} shape='square' />
				<span className='min-w-0 truncate font-medium text-primary'>{row.original.title}</span>
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
		cell: ({ row }) => <span className='tabular-nums'>{row.original.episodes > 0 ? row.original.episodes : "-"}</span>,
	},
	{
		accessorKey: "averageScore",
		header: "Score",
		cell: ({ row }) => <span className='tabular-nums'>{row.original.averageScore > 0 ? `${row.original.averageScore}%` : "-"}</span>,
	},
	{
		id: "season",
		accessorFn: (row) => formatSeasonLabel(row.season, row.seasonYear),
		header: "Season",
		cell: ({ row }) => formatSeasonLabel(row.original.season, row.original.seasonYear) || "-",
	},
];

const SEARCH_GROUP_ORDER = ["Not in list", ...listStatusSchema.options, "In list"] as const;

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
	const { q, id: openIdRaw } = Route.useSearch();
	const openId = useAnimeInfoOpen()?.id ?? parseAnimeInfoId(openIdRaw);
	const animeInfo = useAnimeInfoNav();
	const query = trpc.anilist.search.useQuery({ q, page: 1 }, { enabled: (q ?? "").trim().length > 0 });
	const listedQuery = trpc.anime.listed.useQuery();
	const listed = listedQuery.data;
	const listedById = useMemo(() => new Map((listed ?? []).map((row) => [row.id, row.status])), [listed]);
	const items = useMemo(() => {
		return (query.data?.items ?? []).map((item) => ({
			...item,
			inList: listedById.has(item.id),
		}));
	}, [listedById, query.data?.items]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [menuRow, setMenuRow] = useState<SearchRow | null>(null);
	const table = useReactTable({
		data: items,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => String(row.id),
		onSortingChange: setSorting,
		state: { sorting },
	});
	const hasQuery = (q ?? "").trim().length > 0;
	const menuStatus = menuRow ? parseListStatus(listedById.get(menuRow.id)) : null;

	return (
		<div className='flex h-full min-h-0 flex-col'>
			<ContextMenu>
				<ContextMenuTrigger className='block h-full min-h-0'>
					<ScrollArea className='h-full'>
						{!hasQuery ? (
							<PlaceholderView icon={SearchIcon} title='Search AniList' description='Type a title in the toolbar and submit.' />
						) : null}
						{hasQuery && query.isPending && items.length === 0 ? <TableRowsSkeleton columnCount={columns.length} /> : null}
						{query.error ? <PlaceholderView icon={CircleAlertIcon} title='Search failed' description={query.error.message} /> : null}
						{hasQuery && !query.isPending && !query.error && items.length === 0 ? (
							<PlaceholderView icon={SearchIcon} title='No results' description={`Nothing matched "${q}".`} />
						) : null}
						{items.length > 0 ? (
							<DataTable
								table={table}
								compact
								groupBy={(row) => {
									if (!row.original.inList) {
										return "Not in list";
									}
									const parsed = listStatusSchema.safeParse(listedById.get(row.original.id));
									return parsed.success ? parsed.data : "In list";
								}}
								groupOrder={SEARCH_GROUP_ORDER}
								renderRow={(row, cells) => (
									<TableRow
										data-state={openId === row.original.id ? "selected" : undefined}
										className='cursor-pointer'
										onClick={() => {
											animeInfo.open({
												id: row.original.id,
												infoTab: "main",
											});
										}}
										onContextMenu={() => {
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
					{menuRow ? (
						<AnimeItemCommands
							parts={commandParts}
							mode='discover'
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
