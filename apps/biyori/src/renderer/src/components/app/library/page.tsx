import { t, useTranslation } from "@biyori/translations/react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronLeftIcon, FolderIcon, FolderSearchIcon, HardDriveIcon, MoreHorizontalIcon, UserPlusIcon } from "lucide-react";
import { desktopRpc } from "@/desktop-rpc";
import type { RootFolderOwner, RootFolderRow } from "@/lib/library-summary";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { FolderPicker } from "@/mainview/components/app/library/folder-picker";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/mainview/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { trpc } from "@/mainview/trpc";

const route = getRouteApi("/app/library_/$root");
const EMPTY_ROWS: RootFolderRow[] = [];
const rowModel = getCoreRowModel<RootFolderRow>();

function OwnerCover({ owner }: { owner: RootFolderOwner }) {
	return <AnimeCover id={owner.animeId} coverUrl={owner.coverUrl} alt='' lazy className='h-9 w-6 shrink-0 overflow-hidden rounded-sm' />;
}

function AnimeCell({ row }: { row: RootFolderRow }) {
	const { t } = useTranslation();
	if (row.status === "unmatched") {
		return <span className='text-muted-foreground'>{t("library.notMatched")}</span>;
	}
	if (row.status === "ignored") {
		return <span className='text-muted-foreground'>{t("library.ignored")}</span>;
	}
	const [first, second] = row.owners;
	if (row.status === "multiple") {
		return (
			<span className='flex items-center gap-1.5'>
				{[first, second].map((owner) => (owner ? <OwnerCover key={owner.animeId} owner={owner} /> : null))}
				{row.owners.length > 2 ? <span className='text-xs text-muted-foreground'>+{row.owners.length - 2}</span> : null}
				<span className='truncate text-muted-foreground'>{t("library.multipleAnime", { count: row.owners.length })}</span>
			</span>
		);
	}
	if (!first) {
		return null;
	}
	return (
		<span className='flex min-w-0 items-center gap-2'>
			<OwnerCover owner={first} />
			<span className='truncate'>{first.title}</span>
			{first.onList ? null : <Badge variant='secondary'>{t("library.notOnList")}</Badge>}
		</span>
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
	if (row.status === "unmatched") {
		return (
			<FolderPicker path={row.path}>
				<Button type='button' variant='ghost' size='xs'>
					<UserPlusIcon data-icon='inline-start' />
					{t("library.assign")}
				</Button>
			</FolderPicker>
		);
	}
	return (
		<div className='flex justify-end gap-1'>
			<FolderPicker path={row.path}>
				<Button type='button' variant='ghost' size='xs'>
					{t("library.change")}
				</Button>
			</FolderPicker>
			<DropdownMenu>
				<DropdownMenuTrigger render={<Button type='button' variant='ghost' size='icon-xs' aria-label={t("library.actions")} loading={clear.isPending} />}>
					<MoreHorizontalIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuItem
						onClick={() => {
							clear.mutate({ path: row.path, ignore: false });
						}}>
						{t("library.rematch")}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							clear.mutate({ path: row.path, ignore: true });
						}}>
						{t("library.ignoreFolder")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

const columns: ColumnDef<RootFolderRow>[] = [
	{
		accessorKey: "name",
		header: () => t("library.folder"),
		meta: { className: "max-w-0 w-1/3" },
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
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{Number(getValue())}</span>,
	},
	{
		accessorKey: "episodes",
		header: () => t("library.episodes"),
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{Number(getValue())}</span>,
	},
	{
		id: "anime",
		header: () => t("library.anime"),
		meta: { className: "w-full max-w-0" },
		cell: ({ row }) => <AnimeCell row={row.original} />,
	},
	{
		id: "actions",
		header: () => <span className='sr-only'>{t("library.actions")}</span>,
		meta: { className: "w-44" },
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
		<ScrollArea className='h-full' viewportClassName='flex flex-col gap-4 p-4'>
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
				<Table containerClassName='overflow-hidden rounded-xl border bg-card'>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className='hover:bg-transparent'>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} className={header.column.columnDef.meta?.className}>
										{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</ScrollArea>
	);
}
