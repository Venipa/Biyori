import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { FolderIcon, FolderPlusIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";
import { useFieldArray, useFormContext, useFormState } from "react-hook-form";
import { folderDisplayName } from "@/lib/folder-path";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import { Button } from "@/mainview/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSet } from "@/mainview/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
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
		<FieldSet className='group rounded-lg border p-4'>
			<FieldLegend variant='label'>Library folders</FieldLegend>
			<FieldDescription>These folders are scanned and monitored for new episodes.</FieldDescription>
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
		</FieldSet>
	);
}

export function LibraryPanel() {
	const realtimeId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<Tabs defaultValue='folders'>
			<TabsList>
				<TabsTrigger value='folders'>Folders</TabsTrigger>
			</TabsList>
			<TabsContent value='folders' className='pt-4'>
				<FieldGroup>
					<LibraryFoldersField />
					<FieldSet className='rounded-lg border p-4'>
						<FieldLegend variant='label'>Real-time monitor</FieldLegend>
						<FormCheckbox control={form.control} name='realtimeMonitor' id={realtimeId} label='Detect new files and folders under library folders' />
					</FieldSet>
				</FieldGroup>
			</TabsContent>
		</Tabs>
	);
}
