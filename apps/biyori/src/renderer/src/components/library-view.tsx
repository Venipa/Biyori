import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { FolderIcon, FolderPlusIcon, FolderSearchIcon, HardDriveIcon } from "lucide-react";
import { useRef } from "react";
import { desktopRpc } from "@/desktop-rpc";
import type { LibraryFolderRow } from "@/lib/library-summary";
import { Button } from "@/mainview/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Spinner } from "@/mainview/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import { useAddLibraryFolder } from "@/mainview/lib/library-folder";
import { trpc } from "@/mainview/trpc";

const EMPTY_FOLDERS: LibraryFolderRow[] = [];
const libraryFolderRowModel = getCoreRowModel<LibraryFolderRow>();

const STATUS_LABEL = {
	missing: "Missing",
	empty: "Not scanned",
	indexed: "Indexed",
} as const;

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
	const utils = trpc.useUtils();
	const scanFolder = trpc.library.scanFolder.useMutation({
		onSuccess: () => {
			void utils.library.summary.invalidate();
		},
	});
	const busy = scanFolder.isPending;
	const missing = row.missing;
	const scanLabel = missing ? "Folder is missing" : `Scan ${row.name}`;
	const openLabel = missing ? "Folder is missing" : `Open ${row.name}`;

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
							disabled={missing || busy}
							onClick={() => {
								void scanFolder.mutateAsync({ path: row.path });
							}}
						/>
					}>
					{busy ? <Spinner size='xs' /> : <FolderSearchIcon />}
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
		header: "Name",
		cell: ({ row }) => (
			<span className='flex min-w-0 items-center gap-2'>
				<FolderIcon className='size-4 shrink-0 text-muted-foreground' />
				<span className='truncate font-medium'>{row.original.name}</span>
			</span>
		),
	},
	{
		accessorKey: "path",
		header: "Path",
		meta: { className: "w-full max-w-0" },
		cell: ({ getValue }) => <span className='block truncate text-muted-foreground'>{String(getValue())}</span>,
	},
	{
		accessorKey: "series",
		header: "Series",
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{Number(getValue())}</span>,
	},
	{
		accessorKey: "episodes",
		header: "Episodes",
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{Number(getValue())}</span>,
	},
	{
		accessorKey: "files",
		header: "Files",
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{Number(getValue())}</span>,
	},
	{
		accessorKey: "bytes",
		header: "Size",
		meta: { className: "text-right" },
		cell: ({ getValue }) => <span className='tabular-nums'>{formatBytes(Number(getValue()))}</span>,
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => <span className={row.original.status === "missing" ? "text-destructive" : "text-muted-foreground"}>{STATUS_LABEL[row.original.status]}</span>,
	},
	{
		id: "actions",
		header: () => <span className='sr-only'>Actions</span>,
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
	const utils = trpc.useUtils();
	const addLibraryFolder = useAddLibraryFolder();
	const summaryQuery = trpc.library.summary.useQuery();
	const activityQuery = trpc.activity.snapshot.useQuery();
	const wasScanning = useRef(false);
	const scan = trpc.library.scan.useMutation({
		onSuccess: () => {
			void utils.library.summary.invalidate();
		},
	});
	const scanAll = trpc.library.scanAll.useMutation({
		onSuccess: () => {
			void utils.library.summary.invalidate();
		},
	});

	trpc.activity.onChange.useSubscription(undefined, {
		onData: (snapshot) => {
			utils.activity.snapshot.setData(undefined, snapshot);
			const scanning = snapshot.live.some((entry) => entry.source === "library-scan");
			if (wasScanning.current && !scanning) {
				void utils.library.summary.invalidate();
			}
			wasScanning.current = scanning;
		},
	});

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
	const subtitle = live ? `${live.title}${live.body ? ` - ${live.body}` : ""}` : lastScan ? `Last scan: ${lastScan}` : "Folders scanned for local episodes";

	return (
		<ScrollArea className='h-full' viewportClassName='flex flex-col gap-4 p-4'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div className='min-w-0'>
					<h1 className='text-lg font-semibold'>Library</h1>
					<p className='text-sm text-muted-foreground'>{subtitle}</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button
						type='button'
						variant='outline'
						disabled={scanning || folders.length === 0}
						onClick={() => {
							void scan.mutateAsync();
						}}>
						{scan.isPending ? <Spinner data-icon='inline-start' size='xs' /> : <FolderSearchIcon data-icon='inline-start' />}
						Scan available
					</Button>
					<Button
						type='button'
						variant='outline'
						disabled={scanning || folders.length === 0}
						onClick={() => {
							void scanAll.mutateAsync();
						}}>
						{scanAll.isPending ? <Spinner data-icon='inline-start' size='xs' /> : <FolderSearchIcon data-icon='inline-start' />}
						Scan folders
					</Button>
					<Button
						type='button'
						onClick={() => {
							void addLibraryFolder.addFromPicker();
						}}
						disabled={addLibraryFolder.isPending}>
						<FolderPlusIcon data-icon='inline-start' />
						Add folder
					</Button>
				</div>
			</div>

			<div className='flex flex-wrap gap-2'>
				<StatTile label='Folders' value={totals ? String(totals.folders) : "..."} />
				<StatTile label='Series' value={totals ? String(totals.series) : "..."} />
				<StatTile label='Episodes' value={totals ? String(totals.episodes) : "..."} />
				<StatTile label='Files' value={totals ? String(totals.files) : "..."} />
				<StatTile label='Size' value={totals ? formatBytes(totals.bytes) : "..."} />
			</div>

			{outside && outside.files > 0 ? (
				<p className='text-sm text-muted-foreground'>
					{outside.files} scanned {outside.files === 1 ? "file sits" : "files sit"} outside these folders ({formatBytes(outside.bytes)}).
				</p>
			) : null}

			{summaryQuery.isPending ? (
				<Skeleton className='h-40 w-full rounded-xl' />
			) : folders.length === 0 ? (
				<Empty className='min-h-40 border border-dashed'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<FolderIcon />
						</EmptyMedia>
						<EmptyTitle>No library folders</EmptyTitle>
						<EmptyDescription>Add a folder to scan and monitor for episodes.</EmptyDescription>
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
