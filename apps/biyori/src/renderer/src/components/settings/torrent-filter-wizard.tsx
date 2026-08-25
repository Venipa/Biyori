import {
    ArrowDownIcon,
    ArrowUpIcon,
    FilterIcon,
    FilterXIcon,
    MinusIcon,
    PencilIcon,
    PlusIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { AiringStatusMark } from "@/components/airing-status";
import {
    blankTorrentFilter,
    cloneTorrentFilter,
    TORRENT_FILTER_ACTION_LABELS,
    TORRENT_FILTER_ELEMENT_LABELS,
    TORRENT_FILTER_MATCH_LABELS,
    TORRENT_FILTER_OPERATOR_LABELS,
    TORRENT_FILTER_OPTION_LABELS,
    type TorrentFilter,
    type TorrentFilterAction,
    type TorrentFilterCondition,
    type TorrentFilterElement,
    type TorrentFilterOperator,
    torrentFilterWizardPresets,
} from "@/lib/schemas/torrent-filter";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/mainview/components/ui/dialog";
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/mainview/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/mainview/components/ui/table";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { listStatusSchema } from "@/shared/list";

const ELEMENT_KEYS = Object.keys(
	TORRENT_FILTER_ELEMENT_LABELS,
) as TorrentFilterElement[];
const OPERATOR_KEYS = Object.keys(
	TORRENT_FILTER_OPERATOR_LABELS,
) as TorrentFilterOperator[];
const AIRING_VALUES = [
	"Currently airing",
	"Finished airing",
	"Not yet released",
	"Cancelled",
	"Hiatus",
];
const TYPE_VALUES = ["TV", "ONA", "Movie", "OVA"];
const STATUS_VALUES = [...listStatusSchema.options, "Not in list"];

export type TorrentFilterWizardMode =
	| { kind: "add" }
	| { kind: "edit"; filter: TorrentFilter };

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

function FilterKindIcon({
	action,
	custom,
}: {
	action: TorrentFilterAction;
	custom?: boolean;
}) {
	if (custom) {
		return <PencilIcon className="text-muted-foreground" />;
	}
	if (action === "discard") {
		return <FilterXIcon className="text-destructive" />;
	}
	return <FilterIcon className="text-success" />;
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
			<div className="flex items-center gap-2 rounded-sm px-1 py-0.5 text-sm hover:bg-muted">
				<Checkbox
					id={id}
					checked={checked}
					onCheckedChange={(next) => {
						onCheckedChange(next === true);
					}}
				/>
				<AiringStatusMark status={airingStatus} shape="square" />
				<label htmlFor={id} className="min-w-0 truncate">
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

export function TorrentFilterWizard({ mode, onClose, onSave }: Props) {
	const editing = mode?.kind === "edit";
	const [page, setPage] = useState(editing ? 1 : 0);
	const [draft, setDraft] = useState(() =>
		editing ? cloneTorrentFilter(mode.filter, mode.filter.id) : blankTorrentFilter(),
	);
	const [presetId, setPresetId] = useState("custom");
	const [conditionIndex, setConditionIndex] = useState<number | null>(null);
	const [conditionOpen, setConditionOpen] = useState(false);
	const [error, setError] = useState("");
	const listedQuery = trpc.anime.listed.useQuery(undefined, {
		enabled: Boolean(mode),
	});
	const listed = listedQuery.data ?? [];
	const selectedTitles = listed
		.filter((row) => draft.animeIds.includes(row.id))
		.map((row) => row.title);
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
				setError(
					"There must be at least one condition in order to create a filter.",
				);
				return;
			}
			setError("");
			setPage(2);
			return;
		}
		const name = draft.name.trim() || "New Filter";
		onSave({ ...draft, name });
	}

	return (
		<Dialog
			open={Boolean(mode)}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-2xl"
			>
				<DialogHeader>
					<DialogTitle>{editing ? "Edit Filter" : "Add New Filter"}</DialogTitle>
					<DialogDescription className="text-primary">
						{page === 0
							? "Choose one of the preset filters, or create a custom one"
							: page === 1
								? "Change filter options and add conditions"
								: "Limit this filter to one or more anime title, or leave it blank to apply to all items"}
					</DialogDescription>
				</DialogHeader>
				{page === 0 ? (
					<ul className="flex flex-col gap-1">
						{torrentFilterWizardPresets().map((preset) => (
							<li key={preset.id}>
								<button
									type="button"
									className={cn(
										"flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-muted",
										presetId === preset.id && "bg-muted",
									)}
									onClick={() => {
										setPresetId(preset.id);
									}}
									onDoubleClick={() => {
										applyPreset(preset.id);
										setPage(1);
									}}
								>
									<FilterKindIcon
										action={preset.filter?.action ?? "discard"}
										custom={!preset.filter}
									/>
									<span className="min-w-0">
										<span className="block font-medium">{preset.name}</span>
										<span className="block text-sm text-muted-foreground">
											{preset.description}
										</span>
									</span>
								</button>
							</li>
						))}
					</ul>
				) : null}
				{page === 1 ? (
					<FieldGroup>
						<Field>
							<FieldLabel className="font-medium">Filter name</FieldLabel>
							<Input
								placeholder="Type something to identify this filter"
								value={draft.name}
								onChange={(event) => {
									setDraft({ ...draft, name: event.target.value });
								}}
							/>
						</Field>
						<Field>
							<FieldLabel className="font-medium">Conditions</FieldLabel>
							<div className="flex gap-2">
								<Table containerClassName="min-h-36 flex-1 rounded-md border">
									<TableHeader>
										<TableRow>
											<TableHead>Element</TableHead>
											<TableHead>Operator</TableHead>
											<TableHead>Value</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{draft.conditions.map((condition, index) => (
											<TableRow
												key={`${condition.element}-${condition.op}-${condition.value}`}
												data-state={
													selectedCondition === index ? "selected" : undefined
												}
												className="cursor-pointer"
												onClick={() => {
													setConditionIndex(index);
												}}
												onDoubleClick={() => {
													setConditionIndex(index);
													setConditionOpen(true);
												}}
											>
												<TableCell>
													{TORRENT_FILTER_ELEMENT_LABELS[condition.element]}
												</TableCell>
												<TableCell>
													{TORRENT_FILTER_OPERATOR_LABELS[condition.op]}
												</TableCell>
												<TableCell className="max-w-40 truncate">
													{condition.value || "(empty)"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<div className="flex flex-col gap-1">
									<Button
										type="button"
										size="icon-xs"
										variant="outline"
										aria-label="Add new condition"
										onClick={() => {
											setConditionIndex(null);
											setConditionOpen(true);
										}}
									>
										<PlusIcon data-icon="inline-start" />
									</Button>
									<Button
										type="button"
										size="icon-xs"
										variant="outline"
										aria-label="Delete condition"
										disabled={selectedCondition < 0}
										onClick={() => {
											if (selectedCondition < 0) {
												return;
											}
											setDraft({
												...draft,
												conditions: draft.conditions.filter(
													(_row, index) => index !== selectedCondition,
												),
											});
											setConditionIndex(null);
										}}
									>
										<MinusIcon />
									</Button>
									<Button
										type="button"
										size="icon-xs"
										variant="outline"
										aria-label="Move condition up"
										disabled={selectedCondition <= 0}
										onClick={() => {
											if (selectedCondition <= 0) {
												return;
											}
											setDraft({
												...draft,
												conditions: moveItem(
													draft.conditions,
													selectedCondition,
													selectedCondition - 1,
												),
											});
											setConditionIndex(selectedCondition - 1);
										}}
									>
										<ArrowUpIcon />
									</Button>
									<Button
										type="button"
										size="icon-xs"
										variant="outline"
										aria-label="Move condition down"
										disabled={
											selectedCondition < 0 ||
											selectedCondition >= conditionCount - 1
										}
										onClick={() => {
											if (
												selectedCondition < 0 ||
												selectedCondition >= conditionCount - 1
											) {
												return;
											}
											setDraft({
												...draft,
												conditions: moveItem(
													draft.conditions,
													selectedCondition,
													selectedCondition + 1,
												),
											});
											setConditionIndex(selectedCondition + 1);
										}}
									>
										<ArrowDownIcon />
									</Button>
								</div>
							</div>
							{error ? (
								<p className="text-sm text-destructive">{error}</p>
							) : null}
						</Field>
						<Field>
							<FieldLabel className="font-medium">Options</FieldLabel>
							<div className="grid gap-3 sm:grid-cols-2">
								<Field>
									<FieldLabel>Match</FieldLabel>
									<Select
										value={draft.match}
										items={TORRENT_FILTER_MATCH_LABELS}
										onValueChange={(value) => {
											if (value === "all" || value === "any") {
												setDraft({ ...draft, match: value });
											}
										}}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value="all">
													{TORRENT_FILTER_MATCH_LABELS.all}
												</SelectItem>
												<SelectItem value="any">
													{TORRENT_FILTER_MATCH_LABELS.any}
												</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel>Action</FieldLabel>
									<Select
										value={draft.action}
										items={TORRENT_FILTER_ACTION_LABELS}
										onValueChange={(value) => {
											if (
												value === "discard" ||
												value === "select" ||
												value === "prefer"
											) {
												setDraft({
													...draft,
													action: value,
													option:
														value === "select" ? "default" : draft.option,
												});
											}
										}}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{(
													Object.keys(
														TORRENT_FILTER_ACTION_LABELS,
													) as TorrentFilterAction[]
												).map((action) => (
													<SelectItem key={action} value={action}>
														{TORRENT_FILTER_ACTION_LABELS[action]}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								{showOption ? (
									<Field>
										<FieldLabel>Discard type</FieldLabel>
										<Select
											value={draft.option}
											items={TORRENT_FILTER_OPTION_LABELS}
											onValueChange={(value) => {
												if (
													value === "default" ||
													value === "deactivate" ||
													value === "hide"
												) {
													setDraft({ ...draft, option: value });
												}
											}}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem value="default">
														{TORRENT_FILTER_OPTION_LABELS.default}
													</SelectItem>
													<SelectItem value="deactivate">
														{TORRENT_FILTER_OPTION_LABELS.deactivate}
													</SelectItem>
													<SelectItem value="hide">
														{TORRENT_FILTER_OPTION_LABELS.hide}
													</SelectItem>
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
					<div className="flex flex-col gap-2">
						<ScrollArea className="h-72 rounded-md border">
							{listStatusSchema.options.map((status) => {
								const rows = listed
									.filter((row) => row.status === status)
									.sort((left, right) => left.title.localeCompare(right.title));
								if (rows.length === 0) {
									return null;
								}
								return (
									<details
										key={status}
										className="border-b px-2 py-1"
										open={status === "Currently watching" || undefined}
									>
										<summary className="cursor-pointer text-sm font-medium">
											{status}
										</summary>
										<ul className="flex flex-col gap-1 py-1">
											{rows.map((row) => (
												<AnimeLimitRow
													key={row.id}
													title={row.title}
													airingStatus={row.airingStatus}
													checked={draft.animeIds.includes(row.id)}
													onCheckedChange={(on) => {
														setDraft({
															...draft,
															animeIds: on
																? [...draft.animeIds, row.id]
																: draft.animeIds.filter((id) => id !== row.id),
														});
													}}
												/>
											))}
										</ul>
									</details>
								);
							})}
						</ScrollArea>
						<p className="text-sm text-muted-foreground">
							Currently limited to:{" "}
							{selectedTitles.length > 0
								? selectedTitles.join(", ")
								: "(nothing)"}
						</p>
					</div>
				) : null}
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={page === 0}
						onClick={() => {
							setError("");
							setPage(page - 1);
						}}
					>
						Back
					</Button>
					<Button type="button" onClick={goNext}>
						{page < 2 ? "Next" : "Finish"}
					</Button>
					<Button type="button" variant="outline" onClick={onClose}>
						Cancel
					</Button>
				</DialogFooter>
			</DialogContent>
			{conditionOpen ? (
			<ConditionDialog
				key={conditionIndex ?? "new"}
				open={conditionOpen}
				condition={
					conditionIndex != null ? draft.conditions[conditionIndex] : undefined
				}
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
							conditions: draft.conditions.map((row, index) =>
								index === conditionIndex ? condition : row,
							),
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
	const elementId = useId();
	const opId = useId();
	const valueId = useId();
	const [element, setElement] = useState<TorrentFilterElement>(
		condition?.element ?? "file_title",
	);
	const [op, setOp] = useState<TorrentFilterOperator>(
		condition?.op ?? "contains",
	);
	const [value, setValue] = useState(condition?.value ?? "");
	const choices = valueChoices(element);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{condition ? "Edit Condition" : "Add Condition"}
					</DialogTitle>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={elementId}>Element</FieldLabel>
						<Select
							value={element}
							items={TORRENT_FILTER_ELEMENT_LABELS}
							onValueChange={(next) => {
								if (typeof next === "string") {
									setElement(next as TorrentFilterElement);
									setValue("");
								}
							}}
						>
							<SelectTrigger id={elementId} className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{ELEMENT_KEYS.map((key) => (
										<SelectItem key={key} value={key}>
											{TORRENT_FILTER_ELEMENT_LABELS[key]}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor={opId}>Operator</FieldLabel>
						<Select
							value={op}
							items={TORRENT_FILTER_OPERATOR_LABELS}
							onValueChange={(next) => {
								if (typeof next === "string") {
									setOp(next as TorrentFilterOperator);
								}
							}}
						>
							<SelectTrigger id={opId} className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{OPERATOR_KEYS.map((key) => (
										<SelectItem key={key} value={key}>
											{TORRENT_FILTER_OPERATOR_LABELS[key]}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor={valueId}>Value</FieldLabel>
						{element === "meta_id" ? (
							<Select
								value={value}
								items={Object.fromEntries(
									animeOptions.map((row) => [String(row.id), row.title]),
								)}
								onValueChange={(next) => {
									if (typeof next === "string") {
										setValue(next);
									}
								}}
							>
								<SelectTrigger id={valueId} className="w-full">
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
								items={Object.fromEntries(choices.map((row) => [row, row]))}
								onValueChange={(next) => {
									if (typeof next === "string") {
										setValue(next);
									}
								}}
							>
								<SelectTrigger id={valueId} className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{choices.map((row) => (
											<SelectItem key={row} value={row}>
												{row}
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
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => {
							onSave({ element, op, value });
						}}
					>
						OK
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
