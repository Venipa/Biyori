import { useTranslation } from "@biyori/translations/react";
import { ArrowDownIcon, ArrowUpIcon, FilterIcon, FilterXIcon, MinusIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useId, useState } from "react";
import { AiringStatusMark } from "@/components/app/anime/airing-status";
import {
	blankTorrentFilter,
	cloneTorrentFilter,
	type TorrentFilter,
	type TorrentFilterAction,
	type TorrentFilterCondition,
	type TorrentFilterElement,
	type TorrentFilterOperator,
	torrentFilterWizardPresets,
} from "@/lib/schemas/torrent-filter";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/mainview/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { listStatusSchema } from "@/shared/list";

const AIRING_VALUES = ["Currently airing", "Finished airing", "Not yet released", "Cancelled", "Hiatus"];
const TYPE_VALUES = ["TV", "ONA", "Movie", "OVA"];
const STATUS_VALUES = [...listStatusSchema.options, "Not in list"];

export type TorrentFilterWizardMode = { kind: "add" } | { kind: "edit"; filter: TorrentFilter };

type Props = {
	mode: TorrentFilterWizardMode | null;
	onClose: () => void;
	onSave: (filter: TorrentFilter) => void;
};

function moveItem<T>(items: T[], from: number, to: number): T[] {
	const next = [...items];
	const [row] = next.splice(from, 1);
	if (!row) {
		return items;
	}
	next.splice(to, 0, row);
	return next;
}

function FilterKindIcon({ action, custom }: { action: TorrentFilterAction; custom?: boolean }) {
	if (custom) {
		return <PencilIcon className='text-muted-foreground' />;
	}
	if (action === "discard") {
		return <FilterXIcon className='text-destructive' />;
	}
	return <FilterIcon className='text-success' />;
}

function AnimeLimitRow({
	title,
	airingStatus,
	checked,
	onCheckedChange,
}: {
	title: string;
	airingStatus: string | null;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	const id = useId();
	return (
		<li>
			<div className='flex items-center gap-2 rounded-sm px-1 py-0.5 text-sm hover:bg-muted'>
				<Checkbox
					id={id}
					checked={checked}
					onCheckedChange={(next) => {
						onCheckedChange(next === true);
					}}
				/>
				<AiringStatusMark status={airingStatus} shape='square' />
				<label htmlFor={id} className='min-w-0 truncate'>
					{title}
				</label>
			</div>
		</li>
	);
}

function valueChoices(element: TorrentFilterElement): string[] | null {
	switch (element) {
		case "user_status":
			return STATUS_VALUES;
		case "meta_status":
			return AIRING_VALUES;
		case "meta_type":
			return TYPE_VALUES;
		case "local_episode_available":
			return ["True", "False"];
		default:
			return null;
	}
}

type Translate = ReturnType<typeof useTranslation>["t"];

function listStatusLabel(t: Translate, status: string): string {
	switch (status) {
		case "Currently watching":
			return t("settings.listStatus.currentlyWatching");
		case "Completed":
			return t("settings.listStatus.completed");
		case "On hold":
			return t("settings.listStatus.onHold");
		case "Dropped":
			return t("settings.listStatus.dropped");
		case "Plan to watch":
			return t("settings.listStatus.planToWatch");
		case "Not in list":
			return t("settings.torrents.filters.values.notInList");
		default:
			return status;
	}
}

function filterValueLabel(t: Translate, value: string): string {
	switch (value) {
		case "True":
			return t("settings.torrents.filters.values.true");
		case "False":
			return t("settings.torrents.filters.values.false");
		case "Currently airing":
			return t("settings.torrents.filters.values.currentlyAiring");
		case "Finished airing":
			return t("settings.torrents.filters.values.finishedAiring");
		case "Not yet released":
			return t("settings.torrents.filters.values.notYetReleased");
		case "Cancelled":
			return t("settings.torrents.filters.values.cancelled");
		case "Hiatus":
			return t("settings.torrents.filters.values.hiatus");
		case "TV":
			return t("settings.torrents.filters.values.tv");
		case "ONA":
			return t("settings.torrents.filters.values.ona");
		case "Movie":
			return t("settings.torrents.filters.values.movie");
		case "OVA":
			return t("settings.torrents.filters.values.ova");
		default:
			return listStatusLabel(t, value);
	}
}

function elementItems(t: Translate): Record<TorrentFilterElement, string> {
	return {
		meta_id: t("settings.torrents.filters.elements.metaId"),
		meta_status: t("settings.torrents.filters.elements.metaStatus"),
		meta_type: t("settings.torrents.filters.elements.metaType"),
		meta_episodes: t("settings.torrents.filters.elements.metaEpisodes"),
		meta_date_start: t("settings.torrents.filters.elements.metaDateStart"),
		meta_date_end: t("settings.torrents.filters.elements.metaDateEnd"),
		user_notes: t("settings.torrents.filters.elements.userNotes"),
		user_status: t("settings.torrents.filters.elements.userStatus"),
		local_episode_available: t("settings.torrents.filters.elements.localEpisodeAvailable"),
		episode_title: t("settings.torrents.filters.elements.episodeTitle"),
		episode_number: t("settings.torrents.filters.elements.episodeNumber"),
		episode_version: t("settings.torrents.filters.elements.episodeVersion"),
		episode_group: t("settings.torrents.filters.elements.episodeGroup"),
		episode_video_resolution: t("settings.torrents.filters.elements.episodeVideoResolution"),
		episode_video_type: t("settings.torrents.filters.elements.episodeVideoType"),
		file_title: t("settings.torrents.filters.elements.fileTitle"),
		file_category: t("settings.torrents.filters.elements.fileCategory"),
		file_description: t("settings.torrents.filters.elements.fileDescription"),
		file_link: t("settings.torrents.filters.elements.fileLink"),
		file_size: t("settings.torrents.filters.elements.fileSize"),
	};
}

function operatorItems(t: Translate): Record<TorrentFilterOperator, string> {
	return {
		equals: t("settings.torrents.filters.operators.equals"),
		not_equals: t("settings.torrents.filters.operators.notEquals"),
		gt: t("settings.torrents.filters.operators.gt"),
		gte: t("settings.torrents.filters.operators.gte"),
		lt: t("settings.torrents.filters.operators.lt"),
		lte: t("settings.torrents.filters.operators.lte"),
		begins_with: t("settings.torrents.filters.operators.beginsWith"),
		ends_with: t("settings.torrents.filters.operators.endsWith"),
		contains: t("settings.torrents.filters.operators.contains"),
		not_contains: t("settings.torrents.filters.operators.notContains"),
	};
}

function actionItems(t: Translate): Record<TorrentFilterAction, string> {
	return {
		discard: t("settings.torrents.filters.actions.discard"),
		select: t("settings.torrents.filters.actions.select"),
		prefer: t("settings.torrents.filters.actions.prefer"),
	};
}

function matchItems(t: Translate): Record<"all" | "any", string> {
	return {
		all: t("settings.torrents.filters.matches.all"),
		any: t("settings.torrents.filters.matches.any"),
	};
}

function discardOptionItems(t: Translate): Record<"default" | "deactivate" | "hide", string> {
	return {
		default: t("settings.torrents.filters.discardOptions.default"),
		deactivate: t("settings.torrents.filters.discardOptions.deactivate"),
		hide: t("settings.torrents.filters.discardOptions.hide"),
	};
}

function presetCopy(t: Translate, preset: { id: string; name: string; description: string }): { name: string; description: string } {
	switch (preset.id) {
		case "custom":
			return {
				name: t("settings.torrents.filters.presets.custom.name"),
				description: t("settings.torrents.filters.presets.custom.description"),
			};
		case "fansub":
			return {
				name: t("settings.torrents.filters.presets.fansub.name"),
				description: t("settings.torrents.filters.presets.fansub.description"),
			};
		case "bad-keywords":
			return {
				name: t("settings.torrents.filters.presets.badKeywords.name"),
				description: t("settings.torrents.filters.presets.badKeywords.description"),
			};
		case "new-versions":
			return {
				name: t("settings.torrents.filters.presets.newVersions.name"),
				description: t("settings.torrents.filters.presets.newVersions.description"),
			};
		default:
			return { name: preset.name, description: preset.description };
	}
}

export function TorrentFilterWizard({ mode, onClose, onSave }: Props) {
	const { t } = useTranslation();
	const elements = elementItems(t);
	const operators = operatorItems(t);
	const actions = actionItems(t);
	const matches = matchItems(t);
	const discardOptions = discardOptionItems(t);
	const editing = mode?.kind === "edit";
	const [page, setPage] = useState(editing ? 1 : 0);
	const [draft, setDraft] = useState(() => (editing ? cloneTorrentFilter(mode.filter, mode.filter.id) : blankTorrentFilter()));
	const [presetId, setPresetId] = useState("custom");
	const [conditionIndex, setConditionIndex] = useState<number | null>(null);
	const [conditionOpen, setConditionOpen] = useState(false);
	const [error, setError] = useState(false);
	const listedQuery = trpc.anime.listed.useQuery(undefined, {
		enabled: Boolean(mode),
	});
	const listed = listedQuery.data ?? [];
	const selectedTitles = listed.filter((row) => draft.animeIds.includes(row.id)).map((row) => row.title);
	const showOption = draft.action === "discard" || draft.action === "prefer";
	const selectedCondition = conditionIndex ?? -1;
	const conditionCount = draft.conditions.length;

	function applyPreset(id: string): void {
		setPresetId(id);
		const preset = torrentFilterWizardPresets().find((row) => row.id === id);
		if (!preset?.filter) {
			setDraft(blankTorrentFilter());
			return;
		}
		setDraft(cloneTorrentFilter(preset.filter));
	}

	function goNext(): void {
		if (page === 0) {
			applyPreset(presetId);
			setPage(1);
			return;
		}
		if (page === 1) {
			if (draft.conditions.length === 0) {
				setError(true);
				return;
			}
			setError(false);
			setPage(2);
			return;
		}
		const name = draft.name.trim() || t("settings.torrents.filters.unnamed");
		onSave({ ...draft, name });
	}

	return (
		<Dialog
			open={Boolean(mode)}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}>
			<DialogContent showCloseButton={false} className='sm:max-w-2xl'>
				<DialogHeader>
					<DialogTitle>{editing ? t("settings.torrents.filters.editTitle") : t("settings.torrents.filters.addTitle")}</DialogTitle>
					<DialogDescription className='text-primary'>
						{page === 0 ? t("settings.torrents.filters.pagePreset") : page === 1 ? t("settings.torrents.filters.pageConditions") : t("settings.torrents.filters.pageLimit")}
					</DialogDescription>
				</DialogHeader>
				{page === 0 ? (
					<ul className='flex flex-col gap-1'>
						{torrentFilterWizardPresets().map((preset) => {
							const copy = presetCopy(t, preset);
							return (
								<li key={preset.id}>
									<button
										type='button'
										className={cn("flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-muted", presetId === preset.id && "bg-muted")}
										onClick={() => {
											setPresetId(preset.id);
										}}
										onDoubleClick={() => {
											applyPreset(preset.id);
											setPage(1);
										}}>
										<FilterKindIcon action={preset.filter?.action ?? "discard"} custom={!preset.filter} />
										<span className='min-w-0'>
											<span className='block font-medium'>{copy.name}</span>
											<span className='block text-sm text-muted-foreground'>{copy.description}</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				) : null}
				{page === 1 ? (
					<FieldGroup>
						<Field>
							<FieldLabel className='font-medium'>{t("settings.torrents.filters.filterName")}</FieldLabel>
							<Input
								placeholder={t("settings.torrents.filters.namePlaceholder")}
								value={draft.name}
								onChange={(event) => {
									setDraft({ ...draft, name: event.target.value });
								}}
							/>
						</Field>
						<Field>
							<FieldLabel className='font-medium'>{t("settings.torrents.filters.conditions")}</FieldLabel>
							<div className='flex gap-2'>
								<Table containerClassName='min-h-36 flex-1 rounded-md border'>
									<TableHeader>
										<TableRow>
											<TableHead>{t("settings.torrents.filters.element")}</TableHead>
											<TableHead>{t("settings.torrents.filters.operator")}</TableHead>
											<TableHead>{t("settings.torrents.filters.value")}</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{draft.conditions.map((condition, index) => (
											<TableRow
												key={`${condition.element}-${condition.op}-${condition.value}`}
												data-state={selectedCondition === index ? "selected" : undefined}
												className='cursor-pointer'
												onClick={() => {
													setConditionIndex(index);
												}}
												onDoubleClick={() => {
													setConditionIndex(index);
													setConditionOpen(true);
												}}>
												<TableCell>{elements[condition.element]}</TableCell>
												<TableCell>{operators[condition.op]}</TableCell>
												<TableCell className='max-w-40 truncate'>{condition.value ? filterValueLabel(t, condition.value) : t("settings.torrents.filters.empty")}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<div className='flex flex-col gap-1'>
									<Button
										type='button'
										size='icon-xs'
										variant='outline'
										aria-label={t("settings.torrents.filters.addCondition")}
										onClick={() => {
											setConditionIndex(null);
											setConditionOpen(true);
										}}>
										<PlusIcon data-icon='inline-start' />
									</Button>
									<Button
										type='button'
										size='icon-xs'
										variant='outline'
										aria-label={t("settings.torrents.filters.deleteCondition")}
										disabled={selectedCondition < 0}
										onClick={() => {
											if (selectedCondition < 0) {
												return;
											}
											setDraft({
												...draft,
												conditions: draft.conditions.filter((_row, index) => index !== selectedCondition),
											});
											setConditionIndex(null);
										}}>
										<MinusIcon />
									</Button>
									<Button
										type='button'
										size='icon-xs'
										variant='outline'
										aria-label={t("settings.torrents.filters.moveConditionUp")}
										disabled={selectedCondition <= 0}
										onClick={() => {
											if (selectedCondition <= 0) {
												return;
											}
											setDraft({
												...draft,
												conditions: moveItem(draft.conditions, selectedCondition, selectedCondition - 1),
											});
											setConditionIndex(selectedCondition - 1);
										}}>
										<ArrowUpIcon />
									</Button>
									<Button
										type='button'
										size='icon-xs'
										variant='outline'
										aria-label={t("settings.torrents.filters.moveConditionDown")}
										disabled={selectedCondition < 0 || selectedCondition >= conditionCount - 1}
										onClick={() => {
											if (selectedCondition < 0 || selectedCondition >= conditionCount - 1) {
												return;
											}
											setDraft({
												...draft,
												conditions: moveItem(draft.conditions, selectedCondition, selectedCondition + 1),
											});
											setConditionIndex(selectedCondition + 1);
										}}>
										<ArrowDownIcon />
									</Button>
								</div>
							</div>
							{error ? <p className='text-sm text-destructive'>{t("settings.torrents.filters.needCondition")}</p> : null}
						</Field>
						<Field>
							<FieldLabel className='font-medium'>{t("settings.torrents.filters.options")}</FieldLabel>
							<div className='grid gap-3 sm:grid-cols-2'>
								<Field>
									<FieldLabel>{t("settings.torrents.filters.match")}</FieldLabel>
									<Select
										value={draft.match}
										items={matches}
										onValueChange={(value) => {
											if (value === "all" || value === "any") {
												setDraft({ ...draft, match: value });
											}
										}}>
										<SelectTrigger className='w-full'>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value='all'>{matches.all}</SelectItem>
												<SelectItem value='any'>{matches.any}</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel>{t("settings.torrents.filters.action")}</FieldLabel>
									<Select
										value={draft.action}
										items={actions}
										onValueChange={(value) => {
											if (value === "discard" || value === "select" || value === "prefer") {
												setDraft({
													...draft,
													action: value,
													option: value === "select" ? "default" : draft.option,
												});
											}
										}}>
										<SelectTrigger className='w-full'>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{(Object.keys(actions) as TorrentFilterAction[]).map((action) => (
													<SelectItem key={action} value={action}>
														{actions[action]}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								{showOption ? (
									<Field>
										<FieldLabel>{t("settings.torrents.filters.discardType")}</FieldLabel>
										<Select
											value={draft.option}
											items={discardOptions}
											onValueChange={(value) => {
												if (value === "default" || value === "deactivate" || value === "hide") {
													setDraft({ ...draft, option: value });
												}
											}}>
											<SelectTrigger className='w-full'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem value='default'>{discardOptions.default}</SelectItem>
													<SelectItem value='deactivate'>{discardOptions.deactivate}</SelectItem>
													<SelectItem value='hide'>{discardOptions.hide}</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
									</Field>
								) : null}
							</div>
						</Field>
					</FieldGroup>
				) : null}
				{page === 2 ? (
					<div className='flex flex-col gap-2'>
						<ScrollArea className='h-72 rounded-md border'>
							{listStatusSchema.options.map((status) => {
								const rows = listed.filter((row) => row.status === status).sort((left, right) => left.title.localeCompare(right.title));
								if (rows.length === 0) {
									return null;
								}
								return (
									<details key={status} className='border-b px-2 py-1' open={status === "Currently watching" || undefined}>
										<summary className='cursor-pointer text-sm font-medium'>{listStatusLabel(t, status)}</summary>
										<ul className='flex flex-col gap-1 py-1'>
											{rows.map((row) => (
												<AnimeLimitRow
													key={row.id}
													title={row.title}
													airingStatus={row.airingStatus}
													checked={draft.animeIds.includes(row.id)}
													onCheckedChange={(on) => {
														setDraft({
															...draft,
															animeIds: on ? [...draft.animeIds, row.id] : draft.animeIds.filter((id) => id !== row.id),
														});
													}}
												/>
											))}
										</ul>
									</details>
								);
							})}
						</ScrollArea>
						<p className='text-sm text-muted-foreground'>
							{t("settings.torrents.filters.limitedTo", {
								titles: selectedTitles.length > 0 ? selectedTitles.join(", ") : t("settings.torrents.filters.nothing"),
							})}
						</p>
					</div>
				) : null}
				<DialogFooter className='-mx-4 -mb-4'>
					<Button
						type='button'
						variant='outline'
						disabled={page === 0}
						onClick={() => {
							setError(false);
							setPage(page - 1);
						}}>
						{t("common.back")}
					</Button>
					<Button type='button' onClick={goNext}>
						{page < 2 ? t("settings.torrents.filters.next") : t("settings.torrents.filters.finish")}
					</Button>
					<Button type='button' variant='outline' onClick={onClose}>
						{t("common.cancel")}
					</Button>
				</DialogFooter>
			</DialogContent>
			{conditionOpen ? (
				<ConditionDialog
					key={conditionIndex ?? "new"}
					open={conditionOpen}
					condition={conditionIndex != null ? draft.conditions[conditionIndex] : undefined}
					animeOptions={listed.map((row) => ({
						id: row.id,
						title: row.title,
					}))}
					onClose={() => {
						setConditionOpen(false);
					}}
					onSave={(condition) => {
						if (conditionIndex == null) {
							setDraft({
								...draft,
								conditions: [...draft.conditions, condition],
							});
							setConditionIndex(draft.conditions.length);
						} else {
							setDraft({
								...draft,
								conditions: draft.conditions.map((row, index) => (index === conditionIndex ? condition : row)),
							});
						}
						setConditionOpen(false);
					}}
				/>
			) : null}
		</Dialog>
	);
}

function ConditionDialog({
	open,
	condition,
	animeOptions,
	onClose,
	onSave,
}: {
	open: boolean;
	condition?: TorrentFilterCondition;
	animeOptions: { id: number; title: string }[];
	onClose: () => void;
	onSave: (condition: TorrentFilterCondition) => void;
}) {
	const { t } = useTranslation();
	const elements = elementItems(t);
	const operators = operatorItems(t);
	const elementId = useId();
	const opId = useId();
	const valueId = useId();
	const [element, setElement] = useState<TorrentFilterElement>(condition?.element ?? "file_title");
	const [op, setOp] = useState<TorrentFilterOperator>(condition?.op ?? "contains");
	const [value, setValue] = useState(condition?.value ?? "");
	const choices = valueChoices(element);
	const choiceLabels = Object.fromEntries((choices ?? []).map((row) => [row, filterValueLabel(t, row)]));

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{condition ? t("settings.torrents.filters.editCondition") : t("settings.torrents.filters.addConditionTitle")}</DialogTitle>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={elementId}>{t("settings.torrents.filters.element")}</FieldLabel>
						<Select
							value={element}
							items={elements}
							onValueChange={(next) => {
								if (typeof next === "string") {
									setElement(next as TorrentFilterElement);
									setValue("");
								}
							}}>
							<SelectTrigger id={elementId} className='w-full'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{(Object.keys(elements) as TorrentFilterElement[]).map((key) => (
										<SelectItem key={key} value={key}>
											{elements[key]}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor={opId}>{t("settings.torrents.filters.operator")}</FieldLabel>
						<Select
							value={op}
							items={operators}
							onValueChange={(next) => {
								if (typeof next === "string") {
									setOp(next as TorrentFilterOperator);
								}
							}}>
							<SelectTrigger id={opId} className='w-full'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{(Object.keys(operators) as TorrentFilterOperator[]).map((key) => (
										<SelectItem key={key} value={key}>
											{operators[key]}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor={valueId}>{t("settings.torrents.filters.value")}</FieldLabel>
						{element === "meta_id" ? (
							<Select
								value={value}
								items={Object.fromEntries(animeOptions.map((row) => [String(row.id), row.title]))}
								onValueChange={(next) => {
									if (typeof next === "string") {
										setValue(next);
									}
								}}>
								<SelectTrigger id={valueId} className='w-full'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{animeOptions.map((row) => (
											<SelectItem key={row.id} value={String(row.id)}>
												{row.title}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						) : choices ? (
							<Select
								value={value}
								items={choiceLabels}
								onValueChange={(next) => {
									if (typeof next === "string") {
										setValue(next);
									}
								}}>
								<SelectTrigger id={valueId} className='w-full'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{choices.map((row) => (
											<SelectItem key={row} value={row}>
												{filterValueLabel(t, row)}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						) : (
							<Input
								id={valueId}
								value={value}
								onChange={(event) => {
									setValue(event.target.value);
								}}
							/>
						)}
					</Field>
				</FieldGroup>
				<DialogFooter className='-mx-4 -mb-4'>
					<Button type='button' variant='outline' onClick={onClose}>
						{t("common.cancel")}
					</Button>
					<Button
						type='button'
						onClick={() => {
							onSave({ element, op, value });
						}}>
						{t("common.ok")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
