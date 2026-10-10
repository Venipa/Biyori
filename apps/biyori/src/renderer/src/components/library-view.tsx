import { t, useTranslation } from "@biyori/translations/react";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { FolderIcon, FolderPlusIcon, FolderSearchIcon, HardDriveIcon } from "lucide-react";
import { desktopRpc } from "@/desktop-rpc";
import type { LibraryFolderRow } from "@/lib/library-summary";
import { Button } from "@/mainview/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import { useAddLibraryFolder } from "@/mainview/lib/library-folder";
import { trpc } from "@/mainview/trpc";

const EMPTY_FOLDERS: LibraryFolderRow[] = [];
const libraryFolderRowModel = getCoreRowModel<LibraryFolderRow>();

function statusLabel(status: LibraryFolderRow["status"]): string {
	switch (status) {
		case "missing":
			return t("library.missing");
		case "empty":
			return t("library.notScanned");
		case "indexed":
			return t("library.indexed");
	}
}

function formatBytes(bytes: number): string {
	const units = ["B", "KiB", "MiB", "GiB", "TiB"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function LibraryFolderActions({ row }: { row: LibraryFolderRow }) {
	const { t } = useTranslation();
	const scanFolder = trpc.library.scanFolder.useMutation();
	const busy = scanFolder.isPending;
	const missing = row.missing;
	const scanLabel = missing ? t("library.folderMissing") : t("library.scanFolder", { name: row.name });
	const openLabel = missing ? t("library.folderMissing") : t("library.openFolder", { name: row.name });

	return (
		<div className='flex justify-end gap-1'>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							type='button'
							variant='ghost'
							size='icon-xs'
							aria-label={scanLabel}
							loading={busy}
							disabled={missing}
							onClick={() => {
								void scanFolder.mutateAsync({ path: row.path });
							}}
						/>
					}>
					<FolderSearchIcon />
				</TooltipTrigger>
				<TooltipContent>{scanLabel}</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							type='button'
							variant='ghost'
							size='icon-xs'
							aria-label={openLabel}
							disabled={missing}
							onClick={() => {
								void desktopRpc.request.openPath({ path: row.path });
							}}
						/>
					}>
					<HardDriveIcon />
				</TooltipTrigger>
				<TooltipContent>{openLabel}</TooltipContent>
			</Tooltip>
		</div>
	);
}

const columns: ColumnDef<LibraryFolderRow>[] = [
	{
		accessorKey: "name",
		header: () => t("library.name"),
		cell: ({ row }) => (
			<span className='flex min-w-0 items-center gap-2'>
				<FolderIcon className='size-4 shrink-0 text-muted-foreground' />
				<span className='truncate font-medium'>{row.original.name}</span>
			</span>
		),
	},
	{
		accessorKey: "path",
		header: () => t("library.path"),
		meta: { className: "w-full max-w-0" },
		cell: ({ getValue }) => <span className='block truncate text-muted-foreground'>{String(getValue())}</span>,
	},
	{
		accessorKey: "series",
		header: () => t("library.series"),
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
		accessorKey: "files",
		header: () => t("library.files"),
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{Number(getValue())}</span>,
	},
	{
		accessorKey: "bytes",
		header: () => t("library.size"),
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{formatBytes(Number(getValue()))}</span>,
	},
	{
		accessorKey: "status",
		header: () => t("library.status"),
		cell: ({ row }) => <span className={row.original.status === "missing" ? "text-destructive" : "text-muted-foreground"}>{statusLabel(row.original.status)}</span>,
	},
	{
		id: "actions",
		header: () => <span className='sr-only'>{t("library.actions")}</span>,
		meta: { className: "w-28" },
		cell: ({ row }) => <LibraryFolderActions row={row.original} />,
	},
];

function StatTile({ label, value }: { label: string; value: string }) {
	return (
		<div className='flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl border bg-card px-4 py-3'>
			<p className='text-xs text-muted-foreground'>{label}</p>
			<p className='truncate text-lg font-medium tabular-nums'>{value}</p>
		</div>
	);
}

function scanLive(live: Array<{ source: string; title: string; body?: string }>): { title: string; body: string } | null {
	const item = live.find((entry) => entry.source === "library-scan");
	if (!item) {
		return null;
	}
	return { title: item.title, body: item.body?.trim() ?? "" };
}

function lastScanBody(items: Array<{ source: string; body?: string }>): string | null {
	const item = items.find((entry) => entry.source === "library-scan");
	const body = item?.body?.trim();
	return body ? body : null;
}

export function LibraryView() {
	const { t } = useTranslation();
	const addLibraryFolder = useAddLibraryFolder();
	const summaryQuery = trpc.library.summary.useQuery();
	const activityQuery = trpc.activity.snapshot.useQuery();
	const scan = trpc.library.scan.useMutation();
	const scanAll = trpc.library.scanAll.useMutation();

	const folders = summaryQuery.data?.folders ?? EMPTY_FOLDERS;
	const totals = summaryQuery.data?.totals;
	const outside = summaryQuery.data?.outside;
	const live = scanLive(activityQuery.data?.live ?? []);
	const lastScan = lastScanBody(activityQuery.data?.items ?? []);
	const scanning = live != null || scan.isPending || scanAll.isPending;
	const table = useReactTable({
		data: folders,
		columns,
		getCoreRowModel: libraryFolderRowModel,
		getRowId: (row) => row.path,
		enableSorting: false,
	});
	const subtitle = live
		? live.body
			? t("library.liveScan", { title: live.title, body: live.body })
			: live.title
		: lastScan
			? t("library.lastScan", { body: lastScan })
			: t("library.foldersScanned");

	return (
		<ScrollArea className='h-full' viewportClassName='flex flex-col gap-4 p-4'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div className='min-w-0'>
					<h1 className='text-lg font-semibold'>{t("library.title")}</h1>
					<p className='text-sm text-muted-foreground'>{subtitle}</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button
						type='button'
						variant='outline'
						loading={scan.isPending}
						disabled={scanning || folders.length === 0}
						onClick={() => {
							void scan.mutateAsync();
						}}>
						<FolderSearchIcon data-icon='inline-start' />
						{t("library.scanAvailable")}
					</Button>
					<Button
						type='button'
						variant='outline'
						loading={scanAll.isPending}
						disabled={scanning || folders.length === 0}
						onClick={() => {
							void scanAll.mutateAsync();
						}}>
						<FolderSearchIcon data-icon='inline-start' />
						{t("library.scanFolders")}
					</Button>
					<Button
						type='button'
						onClick={() => {
							void addLibraryFolder.addFromPicker();
						}}
						disabled={addLibraryFolder.isPending}>
						<FolderPlusIcon data-icon='inline-start' />
						{t("library.addFolder")}
					</Button>
				</div>
			</div>

			<div className='flex flex-wrap gap-2'>
				<StatTile label={t("library.folders")} value={totals ? String(totals.folders) : t("library.pending")} />
				<StatTile label={t("library.series")} value={totals ? String(totals.series) : t("library.pending")} />
				<StatTile label={t("library.episodes")} value={totals ? String(totals.episodes) : t("library.pending")} />
				<StatTile label={t("library.files")} value={totals ? String(totals.files) : t("library.pending")} />
				<StatTile label={t("library.size")} value={totals ? formatBytes(totals.bytes) : t("library.pending")} />
			</div>

			{outside && outside.files > 0 ? (
				<p className='text-sm text-muted-foreground'>{t("library.outsideFiles", { count: outside.files, size: formatBytes(outside.bytes) })}</p>
			) : null}

			{summaryQuery.isPending ? (
				<Skeleton className='h-40 w-full rounded-xl' />
			) : folders.length === 0 ? (
				<Empty className='min-h-40 border border-dashed'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<FolderIcon />
						</EmptyMedia>
						<EmptyTitle>{t("library.noFolders")}</EmptyTitle>
						<EmptyDescription>{t("library.addFolderHint")}</EmptyDescription>
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
