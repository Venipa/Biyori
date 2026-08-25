import {
	ArrowDownIcon,
	ArrowUpIcon,
	DownloadIcon,
	FilterIcon,
	FilterXIcon,
	MinusIcon,
	PlusIcon,
	UploadIcon,
	XIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { desktopRpc } from "@/desktop-rpc";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import {
	cloneTorrentFilter,
	defaultTorrentFilters,
	parseTorrentFilterExport,
	type TorrentFilter,
	type TorrentFilterAction,
} from "@/lib/schemas/torrent-filter";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/mainview/components/ui/alert-dialog";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { FieldDescription, FieldGroup } from "@/mainview/components/ui/field";
import { Separator } from "@/mainview/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/mainview/components/ui/table";
import { cn } from "@/mainview/lib/utils";
import {
	TorrentFilterWizard,
	type TorrentFilterWizardMode,
} from "./torrent-filter-wizard";

function moveItem<T>(items: T[], from: number, to: number): T[] {
	const next = [...items];
	const [row] = next.splice(from, 1);
	if (!row) {
		return items;
	}
	next.splice(to, 0, row);
	return next;
}

function FilterActionIcon({ action }: { action: TorrentFilterAction }) {
	if (action === "discard") {
		return <FilterXIcon className="text-destructive" />;
	}
	return <FilterIcon className="text-success" />;
}

export function TorrentFiltersTab() {
	const filterId = useId();
	const form = useFormContext<AppSettingsInput>();
	const filters = useFieldArray({
		control: form.control,
		name: "torrentFilters",
	});
	const enabled = form.watch("torrentFilterEnabled");
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [wizard, setWizard] = useState<TorrentFilterWizardMode | null>(null);
	const [resetOpen, setResetOpen] = useState(false);
	const [importError, setImportError] = useState(false);
	const selected = selectedIndex ?? -1;
	const canMoveUp = enabled && selected > 0;
	const canMoveDown =
		enabled && selected >= 0 && selected < filters.fields.length - 1;
	const canRemove = enabled && selected >= 0;

	function currentFilters(): TorrentFilter[] {
		return form.getValues("torrentFilters") ?? [];
	}

	function replaceFilters(next: TorrentFilter[]): void {
		filters.replace(next);
		setSelectedIndex(next.length > 0 ? Math.min(selected, next.length - 1) : null);
	}

	function swap(from: number, to: number): void {
		replaceFilters(moveItem(currentFilters(), from, to));
		setSelectedIndex(to);
	}

	return (
		<FieldGroup>
			<FormCheckbox
				control={form.control}
				name="torrentFilterEnabled"
				id={filterId}
				label="Enable torrent filters"
			/>
			<FieldDescription>
				Filters allow you to download the files you want and ignore the others.
			</FieldDescription>
			<div
				className={cn(
					"flex flex-col gap-2",
					!enabled && "pointer-events-none opacity-50",
				)}
			>
				<Table containerClassName="max-h-80 overflow-y-auto rounded-md border">
					<TableHeader>
						<TableRow>
							<TableHead className="w-8" />
							<TableHead>Name</TableHead>
							<TableHead className="text-right">Applies to</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filters.fields.map((row, index) => (
							<TableRow
								key={row.id}
								data-state={selected === index ? "selected" : undefined}
								className="cursor-pointer"
								onClick={() => {
									setSelectedIndex(index);
								}}
								onDoubleClick={() => {
									setSelectedIndex(index);
									setWizard({ kind: "edit", filter: row });
								}}
								onKeyDown={(event) => {
									if (event.key === "Delete" && selected === index) {
										filters.remove(index);
										setSelectedIndex(null);
									}
								}}
							>
								<TableCell>
									<Checkbox
										aria-label={`Enable ${row.name || "filter"}`}
										checked={row.enabled}
										onCheckedChange={(checked) => {
											filters.update(index, {
												...row,
												enabled: checked === true,
											});
										}}
										onClick={(event) => {
											event.stopPropagation();
										}}
									/>
								</TableCell>
								<TableCell>
									<span className="flex items-center gap-2">
										<FilterActionIcon action={row.action} />
										<span className="truncate">{row.name || "New Filter"}</span>
									</span>
								</TableCell>
								<TableCell className="text-right text-muted-foreground">
									{row.animeIds.length === 0
										? "All"
										: `${row.animeIds.length} anime`}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						size="icon-xs"
						variant="outline"
						aria-label="Add new filter"
						onClick={() => {
							setWizard({ kind: "add" });
						}}
					>
						<PlusIcon data-icon="inline-start" />
					</Button>
					<Button
						type="button"
						size="icon-xs"
						variant="outline"
						aria-label="Delete filter"
						disabled={!canRemove}
						onClick={() => {
							if (selected < 0) {
								return;
							}
							filters.remove(selected);
							setSelectedIndex(null);
						}}
					>
						<MinusIcon data-icon="inline-start" />
					</Button>
					<Separator orientation="vertical" className="mx-1 h-5" />
					<Button
						type="button"
						size="icon-xs"
						variant="outline"
						aria-label="Move up"
						disabled={!canMoveUp}
						onClick={() => {
							swap(selected, selected - 1);
						}}
					>
						<ArrowUpIcon data-icon="inline-start" />
					</Button>
					<Button
						type="button"
						size="icon-xs"
						variant="outline"
						aria-label="Move down"
						disabled={!canMoveDown}
						onClick={() => {
							swap(selected, selected + 1);
						}}
					>
						<ArrowDownIcon data-icon="inline-start" />
					</Button>
					<Separator orientation="vertical" className="mx-1 h-5" />
					<Button
						type="button"
						size="icon-xs"
						variant="outline"
						aria-label="Import filters"
						onClick={() => {
							void desktopRpc.request.importBiyori({}).then((result) => {
								if (result.canceled) {
									return;
								}
								const next = parseTorrentFilterExport(result.payload);
								if (!next) {
									setImportError(true);
									return;
								}
								replaceFilters(
									next.map((row) => cloneTorrentFilter(row, row.id)),
								);
							});
						}}
					>
						<DownloadIcon data-icon="inline-start" />
					</Button>
					<Button
						type="button"
						size="icon-xs"
						variant="outline"
						aria-label="Export filters"
						onClick={() => {
							void desktopRpc.request.exportBiyori({
								defaultName: "torrent-filters.biyori",
								payload: {
									kind: "torrent-filters",
									filters: currentFilters(),
								},
							});
						}}
					>
						<UploadIcon data-icon="inline-start" />
					</Button>
					<Separator orientation="vertical" className="mx-1 h-5" />
					<Button
						type="button"
						size="icon-xs"
						variant="outline"
						aria-label="Reset filters"
						onClick={() => {
							setResetOpen(true);
						}}
					>
						<XIcon className="text-destructive" data-icon="inline-start" />
					</Button>
				</div>
			</div>
			{wizard ? (
				<TorrentFilterWizard
					key={wizard.kind === "edit" ? wizard.filter.id : "add"}
					mode={wizard}
					onClose={() => {
						setWizard(null);
					}}
					onSave={(filter) => {
						if (wizard.kind === "edit" && selected >= 0) {
							filters.update(selected, filter);
						} else {
							filters.append(filter);
							setSelectedIndex(filters.fields.length);
						}
						setWizard(null);
					}}
				/>
			) : null}
			<AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reset Torrent Filters</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to reset the filters? All custom filters
							will be lost.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>No</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								replaceFilters(defaultTorrentFilters());
							}}
						>
							Yes
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog open={importError} onOpenChange={setImportError}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Import Filters</AlertDialogTitle>
						<AlertDialogDescription>
							Could not parse the filter file. It may be missing characters, or
							encoded with an incompatible version of the application.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction>OK</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</FieldGroup>
	);
}
