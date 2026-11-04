import { t, useTranslation } from "@biyori/translations/react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronLeftIcon, FolderIcon, FolderSearchIcon, HardDriveIcon, MoreHorizontalIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { desktopRpc } from "@/desktop-rpc";
import type { RootFolderOwner, RootFolderRow } from "@/lib/library-summary";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { FolderPicker } from "@/mainview/components/app/library/folder-picker";
import { DataTable } from "@/mainview/components/app/shared/data-table";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/mainview/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/mainview/components/ui/popover";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { trpc } from "@/mainview/trpc";

const route = getRouteApi("/app/library_/$root");
const EMPTY_ROWS: RootFolderRow[] = [];
const rowModel = getCoreRowModel<RootFolderRow>();

function OwnerChip({ owner, path }: { owner: RootFolderOwner; path: string }) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const remove = trpc.library.removeFolderOwner.useMutation({
		onSuccess: () => {
			setOpen(false);
		},
	});
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger render={<Button type='button' variant='ghost' className='h-auto max-w-full min-w-0 justify-start gap-2 px-1.5 py-1 font-normal' />}>
				<AnimeCover id={owner.animeId} coverUrl={owner.coverUrl} alt='' lazy className='h-9 w-6 shrink-0 overflow-hidden rounded-sm' />
				<span className='truncate'>{owner.title}</span>
				{owner.onList ? null : <Badge variant='secondary'>{t("library.notOnList")}</Badge>}
			</PopoverTrigger>
			<PopoverContent className='p-1'>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					loading={remove.isPending}
					onClick={() => {
						remove.mutate({ path, animeId: owner.animeId });
					}}>
					<XIcon data-icon='inline-start' />
					{t("library.removeFromFolder")}
				</Button>
			</PopoverContent>
		</Popover>
	);
}

/** Matched anime are chips with a remove popover; the plus on the right opens the list picker. */
function AnimeCell({ row }: { row: RootFolderRow }) {
	const { t } = useTranslation();
	if (row.status === "ignored") {
		return <span className='px-2 text-muted-foreground'>{t("library.ignored")}</span>;
	}
	return (
		<div className='flex min-w-0 items-center gap-1'>
			<div className='flex min-w-0 flex-1 flex-wrap items-center gap-1'>
				{row.owners.length === 0 ? (
					<span className='px-1.5 text-muted-foreground'>{t("library.notMatched")}</span>
				) : (
					row.owners.map((owner) => <OwnerChip key={owner.animeId} owner={owner} path={row.path} />)
				)}
			</div>
			<FolderPicker path={row.path}>
				<Button type='button' variant='ghost' size='icon-xs' aria-label={t("library.addAnime")}>
					<PlusIcon />
				</Button>
			</FolderPicker>
		</div>
	);
}

function FolderActions({ row }: { row: RootFolderRow }) {
	const { t } = useTranslation();
	const clear = trpc.library.clearFolder.useMutation();
	const unignore = trpc.library.unignoreFolder.useMutation();

	if (row.status === "ignored") {
		return (
			<Button
				type='button'
				variant='ghost'
				size='xs'
				loading={unignore.isPending}
				onClick={() => {
					unignore.mutate({ path: row.path });
				}}>
				{t("library.unignore")}
			</Button>
		);
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button type='button' variant='ghost' size='icon-xs' aria-label={t("library.actions")} loading={clear.isPending} />}>
				<MoreHorizontalIcon />
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				{row.status === "unmatched" ? null : (
					<DropdownMenuItem
						onClick={() => {
							clear.mutate({ path: row.path, ignore: false });
						}}>
						{t("library.rematch")}
					</DropdownMenuItem>
				)}
				<DropdownMenuItem
					onClick={() => {
						clear.mutate({ path: row.path, ignore: true });
					}}>
					{t("library.ignoreFolder")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

const columns: ColumnDef<RootFolderRow>[] = [
	{
		accessorKey: "name",
		header: () => t("library.folder"),
		size: 320,
		cell: ({ row }) => (
			<span className='flex min-w-0 items-center gap-2' title={row.original.path}>
				<FolderIcon className='size-4 shrink-0 text-muted-foreground' />
				<span className='truncate font-medium'>{row.original.name}</span>
			</span>
		),
	},
	{
		accessorKey: "files",
		header: () => t("library.files"),
		size: 72,
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{Number(getValue())}</span>,
	},
	{
		accessorKey: "episodes",
		header: () => t("library.episodes"),
		size: 90,
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{Number(getValue())}</span>,
	},
	{
		id: "anime",
		header: () => t("library.anime"),
		size: 380,
		meta: { className: "p-1" },
		cell: ({ row }) => <AnimeCell row={row.original} />,
	},
	{
		id: "actions",
		header: () => <span className='sr-only'>{t("library.actions")}</span>,
		size: 72,
		meta: { className: "text-right" },
		cell: ({ row }) => <FolderActions row={row.original} />,
	},
];

export function LibraryRootPage() {
	const { t } = useTranslation();
	const { root } = route.useParams();
	const query = trpc.library.folders.useQuery({ root });
	const scanFolder = trpc.library.scanFolder.useMutation();
	const data = query.data;
	const rows = data?.folders ?? EMPTY_ROWS;
	const unmatched = rows.filter((row) => row.status === "unmatched").length;
	const missing = data?.missing ?? false;
	const table = useReactTable({ data: rows, columns, getCoreRowModel: rowModel, getRowId: (row) => row.path, enableSorting: false });

	return (
		<div className='flex h-full min-h-0 flex-col gap-4 p-4'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div className='flex min-w-0 items-start gap-2'>
					<Button type='button' variant='ghost' size='icon-xs' className='mt-1' aria-label={t("library.back")} render={<Link to='/app/library' />}>
						<ChevronLeftIcon />
					</Button>
					<div className='min-w-0'>
						<h1 className='truncate text-lg font-semibold'>{data?.name ?? root}</h1>
						<p className='truncate text-sm text-muted-foreground'>
							{[root, t("library.folderCount", { count: rows.length }), t("library.unmatchedCount", { count: unmatched })].join(" · ")}
						</p>
					</div>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button
						type='button'
						variant='outline'
						loading={scanFolder.isPending}
						disabled={missing}
						onClick={() => {
							scanFolder.mutate({ path: root });
						}}>
						<FolderSearchIcon data-icon='inline-start' />
						{t("library.scanFolders")}
					</Button>
					<Button
						type='button'
						variant='outline'
						disabled={missing}
						onClick={() => {
							void desktopRpc.request.openPath({ path: root });
						}}>
						<HardDriveIcon data-icon='inline-start' />
						{t("library.openRoot")}
					</Button>
				</div>
			</div>

			{unmatched > 0 ? (
				<p className='text-sm text-muted-foreground'>
					{t("library.assignHint")}{" "}
					<Link to='/app/search' className='underline underline-offset-2'>
						{t("library.searchLink")}
					</Link>
				</p>
			) : null}

			{query.isPending ? (
				<Skeleton className='h-40 w-full rounded-xl' />
			) : missing || rows.length === 0 ? (
				<Empty className='min-h-40 border border-dashed'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<FolderIcon />
						</EmptyMedia>
						<EmptyTitle>{missing ? t("library.folderMissing") : t("library.noSeriesFolders")}</EmptyTitle>
						{missing ? null : <EmptyDescription>{t("library.noSeriesFoldersHint")}</EmptyDescription>}
					</EmptyHeader>
				</Empty>
			) : (
				<div className='min-h-0 flex-1 overflow-hidden rounded-xl border bg-card'>
					<ScrollArea className='h-full'>
						<DataTable table={table} />
					</ScrollArea>
				</div>
			)}
		</div>
	);
}
