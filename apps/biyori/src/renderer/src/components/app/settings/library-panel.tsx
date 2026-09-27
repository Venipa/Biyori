import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { FolderIcon, FolderPlusIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";
import { Controller, useFieldArray, useFormContext, useFormState, useWatch } from "react-hook-form";
import { folderDisplayName } from "@/lib/folder-path";
import { type AppSettingsInput, CONTINUE_WATCHING_STALE_DAYS } from "@/lib/schemas/app-settings";
import { SettingsFieldError } from "@/mainview/components/app/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { FormCheckbox } from "@/mainview/components/app/shared/form-checkbox";
import { Button } from "@/mainview/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/mainview/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { folderPathExists, pickLibraryFolderPath } from "@/mainview/lib/library-folder";

const CONTINUE_WATCHING_STALE_OPTIONS = CONTINUE_WATCHING_STALE_DAYS.map((day) => ({
	value: String(day),
	label: `${day} days`,
}));
const CONTINUE_WATCHING_STALE_ITEMS = Object.fromEntries(CONTINUE_WATCHING_STALE_OPTIONS.map((option) => [option.value, option.label]));

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
	const scanId = useId();
	const intervalId = useId();
	const staleDaysId = useId();
	const form = useFormContext<AppSettingsInput>();
	const episodeScanEnabled = useWatch({ control: form.control, name: "episodeScanEnabled" });

	return (
		<>
			<SettingsSectionCard title='Library folders' description='These folders are scanned and monitored for new episodes.'>
				<LibraryFoldersField />
			</SettingsSectionCard>
			<SettingsSectionCard title='Real-time monitor' description='Watch library folders for new files without waiting for a scan.'>
				<FormCheckbox control={form.control} name='realtimeMonitor' id={realtimeId} label='Detect new files and folders under library folders' />
			</SettingsSectionCard>
			<SettingsSectionCard
				title='Episode scan'
				description='On a timer, check series that are missing the next episode. Watching, completed, and plan to watch titles qualify when that episode has aired or airs within 7 days.'>
				<FormCheckbox control={form.control} name='episodeScanEnabled' id={scanId} label='Scan for missing episodes' />
				<Field>
					<FieldLabel htmlFor={intervalId}>Interval</FieldLabel>
					<InputGroup className='w-40'>
						<InputGroupInput
							id={intervalId}
							type='number'
							min={5}
							max={1440}
							disabled={!episodeScanEnabled}
							{...form.register("episodeScanIntervalMinutes", {
								valueAsNumber: true,
							})}
						/>
						<InputGroupAddon align='inline-end'>
							<InputGroupText>(minutes)</InputGroupText>
						</InputGroupAddon>
					</InputGroup>
					<SettingsFieldError<AppSettingsInput> name='episodeScanIntervalMinutes' />
				</Field>
			</SettingsSectionCard>
			<SettingsSectionCard title='Continue watching' description='A next episode indexed this long ago moves into the Earlier rows. A list update older than this does the same.'>
				<Controller
					control={form.control}
					name='continueWatchingStaleDays'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={staleDaysId}>Age</FieldLabel>
							<InputGroup className='w-40'>
								<InputGroupInput
									id={staleDaysId}
									type='number'
									min={1}
									max={365}
									name={field.name}
									ref={field.ref}
									value={typeof field.value === "number" && Number.isFinite(field.value) ? field.value : ""}
									aria-invalid={fieldState.invalid}
									onBlur={field.onBlur}
									onChange={(event) => {
										const next = event.target.valueAsNumber;
										field.onChange(Number.isFinite(next) ? next : event.target.value);
									}}
								/>
								<InputGroupAddon align='inline-end' className='pr-1'>
									<Select
										items={CONTINUE_WATCHING_STALE_ITEMS}
										value={CONTINUE_WATCHING_STALE_DAYS.some((day) => day === field.value) ? String(field.value) : null}
										onValueChange={(next) => {
											if (typeof next === "string") {
												field.onChange(Number(next));
											}
										}}>
										<SelectTrigger
											size='sm'
											aria-label='Day presets'
											className='h-6 gap-1 border-0 bg-transparent px-1.5 text-muted-foreground shadow-none hover:bg-transparent focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent'>
											<SelectValue>days</SelectValue>
										</SelectTrigger>
										<SelectContent align='end' alignItemWithTrigger={false}>
											<SelectGroup>
												{CONTINUE_WATCHING_STALE_OPTIONS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</InputGroupAddon>
							</InputGroup>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
		</>
	);
}
