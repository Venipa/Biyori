import { t, useTranslation } from "@biyori/translations/react";
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, FilterIcon, FilterXIcon, MinusIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { desktopRpc } from "@/desktop-rpc";
import type { SettingsFormInput } from "@/lib/schemas/app-settings";
import { cloneTorrentFilter, defaultTorrentFilters, parseTorrentFilterExport, type TorrentFilter, type TorrentFilterAction } from "@/lib/schemas/torrent-filter";
import { FormCheckbox } from "@/mainview/components/app/shared/form-checkbox";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { cn } from "@/mainview/lib/utils";
import { TorrentFilterWizard, type TorrentFilterWizardMode } from "./torrent-filter-wizard";

function defaultFilterName(name: string): string {
	switch (name) {
		case "Select currently watching":
			return t("settings.torrents.filters.defaults.selectWatching");
		case "Select airing anime in plan to watch":
			return t("settings.torrents.filters.defaults.selectAiringPlan");
		case "Discard dropped":
			return t("settings.torrents.filters.defaults.discardDropped");
		case "Discard and deactivate not-in-list anime":
			return t("settings.torrents.filters.defaults.discardNotInList");
		case "Discard watched and available episodes":
			return t("settings.torrents.filters.defaults.discardWatched");
		case "Prefer high-resolution files":
			return t("settings.torrents.filters.defaults.preferHighResolution");
		default:
			return name;
	}
}

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
		return <FilterXIcon className='text-destructive' />;
	}
	return <FilterIcon className='text-success' />;
}

export function TorrentFiltersTab() {
	const { t } = useTranslation();
	const filterId = useId();
	const form = useFormContext<SettingsFormInput>();
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
	const canMoveDown = enabled && selected >= 0 && selected < filters.fields.length - 1;
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
			<FormCheckbox control={form.control} name='torrentFilterEnabled' id={filterId} label={t("settings.torrents.filters.enable")} />
			<FieldDescription>{t("settings.torrents.filters.hint")}</FieldDescription>
			<div className={cn("flex flex-col gap-2", !enabled && "pointer-events-none opacity-50")}>
				<Table containerClassName='max-h-80 overflow-y-auto rounded-md border'>
					<TableHeader>
						<TableRow>
							<TableHead className='w-8' />
							<TableHead>{t("settings.torrents.filters.name")}</TableHead>
							<TableHead className='text-right'>{t("settings.torrents.filters.appliesTo")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filters.fields.map((row, index) => (
							<TableRow
								key={row.id}
								data-state={selected === index ? "selected" : undefined}
								className='cursor-pointer'
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
								}}>
								<TableCell>
									<Checkbox
										aria-label={t("settings.torrents.filters.enableNamed", { name: row.name ? defaultFilterName(row.name) : t("settings.torrents.filters.filterFallback") })}
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
									<span className='flex items-center gap-2'>
										<FilterActionIcon action={row.action} />
										<span className='truncate'>{row.name ? defaultFilterName(row.name) : t("settings.torrents.filters.unnamed")}</span>
									</span>
								</TableCell>
								<TableCell className='text-right text-muted-foreground'>
									{row.animeIds.length === 0 ? t("settings.torrents.filters.all") : t("settings.torrents.filters.animeCount", { count: row.animeIds.length })}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				<div className='flex items-center gap-1'>
					<Button
						type='button'
						size='icon-xs'
						variant='outline'
						aria-label={t("settings.torrents.filters.add")}
						onClick={() => {
							setWizard({ kind: "add" });
						}}>
						<PlusIcon data-icon='inline-start' />
					</Button>
					<Button
						type='button'
						size='icon-xs'
						variant='outline'
						aria-label={t("settings.torrents.filters.delete")}
						disabled={!canRemove}
						onClick={() => {
							if (selected < 0) {
								return;
							}
							filters.remove(selected);
							setSelectedIndex(null);
						}}>
						<MinusIcon data-icon='inline-start' />
					</Button>
					<Separator orientation='vertical' className='mx-1 h-5' />
					<Button
						type='button'
						size='icon-xs'
						variant='outline'
						aria-label={t("settings.torrents.filters.moveUp")}
						disabled={!canMoveUp}
						onClick={() => {
							swap(selected, selected - 1);
						}}>
						<ArrowUpIcon data-icon='inline-start' />
					</Button>
					<Button
						type='button'
						size='icon-xs'
						variant='outline'
						aria-label={t("settings.torrents.filters.moveDown")}
						disabled={!canMoveDown}
						onClick={() => {
							swap(selected, selected + 1);
						}}>
						<ArrowDownIcon data-icon='inline-start' />
					</Button>
					<Separator orientation='vertical' className='mx-1 h-5' />
					<Button
						type='button'
						size='icon-xs'
						variant='outline'
						aria-label={t("settings.torrents.filters.import")}
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
								replaceFilters(next.map((row) => cloneTorrentFilter(row, row.id)));
							});
						}}>
						<DownloadIcon data-icon='inline-start' />
					</Button>
					<Button
						type='button'
						size='icon-xs'
						variant='outline'
						aria-label={t("settings.torrents.filters.export")}
						onClick={() => {
							const payload = {
								kind: "torrent-filters" as const,
								filters: currentFilters(),
							};
							void desktopRpc.request.exportBiyori({
								defaultName: "torrent-filters.biyori",
								payload,
							});
						}}>
						<UploadIcon data-icon='inline-start' />
					</Button>
					<Separator orientation='vertical' className='mx-1 h-5' />
					<Button
						type='button'
						size='icon-xs'
						variant='outline'
						aria-label={t("settings.torrents.filters.reset")}
						onClick={() => {
							setResetOpen(true);
						}}>
						<XIcon className='text-destructive' data-icon='inline-start' />
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
						<AlertDialogTitle>{t("settings.torrents.filters.resetTitle")}</AlertDialogTitle>
						<AlertDialogDescription>{t("settings.torrents.filters.resetDescription")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("settings.torrents.filters.no")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								replaceFilters(defaultTorrentFilters());
							}}>
							{t("settings.torrents.filters.yes")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog open={importError} onOpenChange={setImportError}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("settings.torrents.filters.importTitle")}</AlertDialogTitle>
						<AlertDialogDescription>{t("settings.torrents.filters.importDescription")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction>{t("common.ok")}</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</FieldGroup>
	);
}
