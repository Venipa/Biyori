import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { FolderIcon, FolderPlusIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";
import { useFieldArray, useFormContext, useFormState } from "react-hook-form";
import { folderDisplayName } from "@/lib/folder-path";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import { SettingsSectionCard } from "@/mainview/components/settings/settings-section-card";
import { Button } from "@/mainview/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { Field, FieldError } from "@/mainview/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { folderPathExists, pickLibraryFolderPath } from "@/mainview/lib/library-folder";

type LibraryFolderRow = {
	id: string;
	path: string;
};

const libraryFolderRowModel = getCoreRowModel<LibraryFolderRow>();

function LibraryFoldersError() {
	const { control } = useFormContext<AppSettingsInput>();
	const { errors } = useFormState({
		control,
		name: "libraryFolders",
	});
	return (
		<FieldError
			errors={[
				{
					message: errors.libraryFolders?.message ?? errors.libraryFolders?.root?.message,
				},
			]}
		/>
	);
}

const emptyLibraryFolders = (
	<Empty className='min-h-32 border border-dashed'>
		<EmptyHeader>
			<EmptyMedia variant='icon'>
				<FolderIcon />
			</EmptyMedia>
			<EmptyTitle>No library folders</EmptyTitle>
			<EmptyDescription>Add a folder to scan and monitor for episodes. Removing a folder only updates settings and does not delete files.</EmptyDescription>
		</EmptyHeader>
	</Empty>
);

function LibraryFoldersField() {
	const form = useFormContext<AppSettingsInput>();
	const folders = useFieldArray({
		control: form.control,
		name: "libraryFolders",
	});
	const rows = folders.fields as unknown as LibraryFolderRow[];

	const columns: ColumnDef<LibraryFolderRow>[] = [
		{
			id: "name",
			accessorFn: (row) => folderDisplayName(row.path),
			header: "Folder",
			cell: ({ getValue }) => (
				<span className='flex min-w-0 items-center gap-2'>
					<FolderIcon />
					<span className='truncate font-medium'>{String(getValue())}</span>
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
			id: "remove",
			header: () => <span className='sr-only'>Remove</span>,
			meta: { className: "w-10" },
			cell: ({ row }) => (
				<Button
					type='button'
					variant='ghost'
					size='icon-xs'
					aria-label={`Remove ${folderDisplayName(row.original.path)} from library`}
					className='opacity-50 group-hover:opacity-100'
					onClick={() => {
						folders.remove(row.index);
					}}>
					<Trash2Icon />
				</Button>
			),
		},
	];

	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: libraryFolderRowModel,
		getRowId: (row) => row.id,
		enableSorting: false,
	});

	function addFolder(path: string): void {
		if (folderPathExists(rows, path)) {
			return;
		}
		folders.append({ path });
	}

	return (
		<>
			<Field>
				{rows.length === 0 ? (
					emptyLibraryFolders
				) : (
					<Table containerClassName='rounded-lg border'>
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
			</Field>
			<LibraryFoldersError />
			<Field>
				<Button
					type='button'
					variant='outline'
					onClick={() => {
						void pickLibraryFolderPath().then((path) => {
							if (path) {
								addFolder(path);
							}
						});
					}}>
					<FolderPlusIcon data-icon='inline-start' />
					Add library folder
				</Button>
			</Field>
		</>
	);
}

export function LibraryPanel() {
	const realtimeId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<SettingsSectionCard title='Library folders' description='These folders are scanned and monitored for new episodes.'>
				<LibraryFoldersField />
			</SettingsSectionCard>
			<SettingsSectionCard title='Real-time monitor' description='Watch library folders for new files without waiting for a full scan.'>
				<FormCheckbox control={form.control} name='realtimeMonitor' id={realtimeId} label='Detect new files and folders under library folders' />
			</SettingsSectionCard>
		</>
	);
}
