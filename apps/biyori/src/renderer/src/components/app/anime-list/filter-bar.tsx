import { t, useTranslation } from "@biyori/translations/react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { type KeyboardEvent, useId, useState } from "react";
import { ListFilterChip } from "@/mainview/components/app/anime-list/filter-chip";
import { ButtonToggle } from "@/mainview/components/ui/button-toggle";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/mainview/components/ui/dropdown-menu";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { animeTypeLabel, appendFilterClauses, type FilterClause, formatSearchOperator, genreLabel, type SearchOperator } from "@/mainview/lib/anime-list-filter";
import { cn } from "@/mainview/lib/utils";

const ANIME_GENRES = [
	"Action",
	"Adventure",
	"Comedy",
	"Drama",
	"Ecchi",
	"Fantasy",
	"Horror",
	"Mahou Shoujo",
	"Mecha",
	"Music",
	"Mystery",
	"Psychological",
	"Romance",
	"Sci-Fi",
	"Slice of Life",
	"Sports",
	"Supernatural",
	"Thriller",
] as const;

const ANIME_TYPES = ["TV", "Movie", "OVA", "ONA"] as const;

const NUMERIC_OPS: Array<{ op: SearchOperator; label: string }> = [
	{ op: "gt", label: ">" },
	{ op: "ge", label: ">=" },
	{ op: "eq", label: "=" },
	{ op: "le", label: "<=" },
	{ op: "lt", label: "<" },
];

const ADDABLE_FIELDS: Array<{ field: FilterClause["field"]; label: () => string }> = [
	{ field: "genre", label: () => t("list.genre") },
	{ field: "tags", label: () => t("list.tags") },
	{ field: "score", label: () => t("list.score") },
	{ field: "popular", label: () => t("list.popular") },
	{ field: "type", label: () => t("list.type") },
	{ field: "year", label: () => t("list.year") },
];

function clauseLabel(field: FilterClause["field"]): string {
	switch (field) {
		case "genre":
			return t("list.genre");
		case "tags":
			return t("list.tags");
		case "score":
			return t("list.score");
		case "popular":
			return t("list.popular");
		case "type":
			return t("list.type");
		case "year":
			return t("list.year");
		case "eps":
			return t("list.eps");
		case "id":
			return t("list.id");
		case "title":
			return t("list.title");
		case "note":
			return t("list.note");
		case "season":
			return t("list.season");
		default:
			return field;
	}
}

function clauseValue(clause: FilterClause): string {
	if (clause.field === "popular") {
		return clause.value.trim().toLowerCase() === "false" ? t("list.no") : t("list.yes");
	}
	if (clause.field === "genre") {
		return splitCsv(clause.value)
			.map((name) => genreLabel(name))
			.join(",");
	}
	if (clause.field === "type") {
		return clause.value
			.split("|")
			.map((part) => animeTypeLabel(part.trim()))
			.filter(Boolean)
			.join("|");
	}
	const op = formatSearchOperator(clause.op);
	return `${op}${clause.value}`;
}

function splitCsv(value: string): string[] {
	return value
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
}

function defaultClause(field: FilterClause["field"]): FilterClause {
	switch (field) {
		case "score":
			return { field, op: "gt", value: "70" };
		case "popular":
			return { field, op: "eq", value: "true" };
		case "year":
			return { field, op: "eq", value: String(new Date().getFullYear()) };
		case "type":
			return { field, op: "eq", value: "TV" };
		case "genre":
			return { field, op: "eq", value: "Action" };
		case "tags":
			return { field, op: "eq", value: "" };
		default:
			return { field, op: "eq", value: "" };
	}
}

function _groupLetter(name: string): string {
	const ch = [...name.trim()][0];
	if (!ch) {
		return "#";
	}
	return /\p{L}/u.test(ch) ? ch.toLocaleUpperCase() : "#";
}

/** Searchable checklist (popover content): selected names pinned on top, arrow keys move between rows. */
function NamedListEditor({
	label,
	names,
	value,
	empty,
	onChange,
	nameLabel,
}: {
	label: string;
	names: readonly string[];
	value: string;
	empty: string;
	onChange: (next: string) => void;
	nameLabel?: (name: string) => string;
}) {
	const { t } = useTranslation();
	const searchId = useId();
	const [query, setQuery] = useState("");
	const needle = query.trim().toLowerCase();
	const current = splitCsv(value);
	const selected = new Set(current.map((item) => item.toLowerCase()));
	const display = (name: string) => (nameLabel ? nameLabel(name) : name);
	const matches = (name: string) => !needle || name.toLowerCase().includes(needle) || display(name).toLowerCase().includes(needle);
	const sorted = [...names].sort((a, b) => display(a).localeCompare(display(b), undefined, { sensitivity: "base" }));
	const pinned = sorted.filter((name) => selected.has(name.toLowerCase()) && matches(name));
	const rest = sorted.filter((name) => !selected.has(name.toLowerCase()) && matches(name));

	function toggle(name: string, on: boolean): void {
		onChange(on ? [...current, name].join(",") : current.filter((item) => item.toLowerCase() !== name.toLowerCase()).join(","));
	}

	function moveFocus(event: KeyboardEvent<HTMLElement>): void {
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
			return;
		}
		event.preventDefault();
		const rows = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-check-row]")];
		const index = rows.indexOf(document.activeElement as HTMLElement);
		const next = event.key === "ArrowDown" ? (index + 1) % rows.length : index <= 0 ? rows.length - 1 : index - 1;
		rows[next]?.focus();
	}

	function row(name: string) {
		const checked = selected.has(name.toLowerCase());
		return (
			<li key={name}>
				<button
					type='button'
					role='checkbox'
					aria-checked={checked}
					data-check-row
					className='flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted'
					onClick={() => {
						toggle(name, !checked);
					}}>
					<span
						aria-hidden
						className={cn("grid size-3.5 shrink-0 place-items-center rounded-[4px] border", checked ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
						{checked ? <CheckIcon className='size-3' /> : null}
					</span>
					<span className='truncate'>{display(name)}</span>
				</button>
			</li>
		);
	}

	return (
		<div className='flex min-h-0 flex-col' onKeyDown={moveFocus}>
			<div className='flex shrink-0 items-center justify-between gap-2 px-3 pt-2 text-xs text-muted-foreground'>
				<span>{current.length > 0 ? `${label} · ${t("list.selectedCount", { count: current.length })}` : label}</span>
				{current.length > 0 ? (
					<button
						type='button'
						className='rounded px-1 hover:text-foreground focus-visible:text-foreground'
						onClick={() => {
							onChange("");
						}}>
						{t("list.clearSelection")}
					</button>
				) : null}
			</div>
			<div className='shrink-0 p-2'>
				<label className='sr-only' htmlFor={searchId}>
					{t("list.searchField", { field: label.toLowerCase() })}
				</label>
				<Input
					id={searchId}
					autoFocus
					className='h-7'
					value={query}
					placeholder={t("list.searchField", { field: label.toLowerCase() })}
					onChange={(event) => {
						setQuery(event.target.value);
					}}
				/>
			</div>
			<ScrollArea className='max-h-[min(20rem,calc(var(--available-height)-6rem))] min-h-0' viewportClassName='max-h-[min(20rem,calc(var(--available-height)-6rem))] px-1 pb-1'>
				{names.length === 0 ? <p className='px-2 py-1 text-xs text-muted-foreground'>{empty}</p> : null}
				{names.length > 0 && pinned.length + rest.length === 0 ? <p className='px-2 py-1 text-xs text-muted-foreground'>{t("list.noMatches")}</p> : null}
				<ul>{pinned.map(row)}</ul>
				{pinned.length > 0 && rest.length > 0 ? <div aria-hidden className='mx-1 my-1 h-px bg-border' /> : null}
				<ul>{rest.map(row)}</ul>
			</ScrollArea>
		</div>
	);
}

function TypeEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
	const { t } = useTranslation();
	const selected = new Set(
		value
			.split("|")
			.flatMap((part) => part.split(","))
			.map((item) => item.trim().toLowerCase())
			.filter(Boolean),
	);
	return (
		<div className='p-1'>
			<DropdownMenuGroup>
				<DropdownMenuLabel>{t("list.type")}</DropdownMenuLabel>
				{ANIME_TYPES.map((type) => {
					const checked = selected.has(type.toLowerCase());
					return (
						<DropdownMenuCheckboxItem
							key={type}
							checked={checked}
							onCheckedChange={(next) => {
								const current = [...selected];
								const key = type.toLowerCase();
								const nextKeys = next ? [...current.filter((item) => item !== key), key] : current.filter((item) => item !== key);
								onChange(ANIME_TYPES.filter((item) => nextKeys.includes(item.toLowerCase())).join("|"));
							}}>
							{animeTypeLabel(type)}
						</DropdownMenuCheckboxItem>
					);
				})}
			</DropdownMenuGroup>
		</div>
	);
}

function GenreEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
	const { t } = useTranslation();
	return <NamedListEditor label={t("list.genres")} names={ANIME_GENRES} value={value} empty={t("list.noGenres")} nameLabel={genreLabel} onChange={onChange} />;
}

function TagEditor({ value, names, onChange }: { value: string; names: string[]; onChange: (next: string) => void }) {
	const { t } = useTranslation();
	return <NamedListEditor label={t("list.tags")} names={names} value={value} empty={t("list.noTags")} onChange={onChange} />;
}

function TextEditor({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
	const id = useId();
	const [draft, setDraft] = useState(value);
	return (
		<div className='flex flex-col gap-1.5 p-1.5'>
			<label className='text-xs text-muted-foreground' htmlFor={id}>
				{label}
			</label>
			<Input
				id={id}
				value={draft}
				onChange={(event) => {
					setDraft(event.target.value);
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						onChange(draft.trim());
					}
				}}
				onBlur={() => {
					onChange(draft.trim());
				}}
			/>
		</div>
	);
}

function NumericEditor({ clause, onChange }: { clause: FilterClause; onChange: (next: FilterClause) => void }) {
	const { t } = useTranslation();
	const id = useId();
	const [draft, setDraft] = useState(clause.value);
	return (
		<div className='flex flex-col gap-1.5 p-1.5'>
			<DropdownMenuRadioGroup
				value={clause.op}
				onValueChange={(op) => {
					onChange({ ...clause, op: op as SearchOperator });
				}}>
				{NUMERIC_OPS.map((item) => (
					<DropdownMenuRadioItem key={item.op} value={item.op}>
						{item.label}
					</DropdownMenuRadioItem>
				))}
			</DropdownMenuRadioGroup>
			<DropdownMenuSeparator />
			<label className='text-xs text-muted-foreground' htmlFor={id}>
				{t("list.value")}
			</label>
			<Input
				id={id}
				type='number'
				value={draft}
				onChange={(event) => {
					setDraft(event.target.value);
				}}
				onBlur={() => {
					if (draft.trim()) {
						onChange({ ...clause, value: draft.trim() });
					}
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter" && draft.trim()) {
						event.preventDefault();
						onChange({ ...clause, value: draft.trim() });
					}
				}}
			/>
		</div>
	);
}

function BooleanEditor({ clause, onChange }: { clause: FilterClause; onChange: (next: FilterClause) => void }) {
	const { t } = useTranslation();
	const selected = clause.value.trim().toLowerCase() === "false" ? "false" : "true";
	return (
		<div className='p-1'>
			<DropdownMenuGroup>
				<DropdownMenuLabel>{t("list.mostPopular")}</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={selected}
					onValueChange={(value) => {
						onChange({ ...clause, op: "eq", value });
					}}>
					<DropdownMenuRadioItem value='true'>{t("list.yes")}</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value='false'>{t("list.no")}</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuGroup>
		</div>
	);
}

function ClauseEditor({ clause, tagNames, onChange }: { clause: FilterClause; tagNames: string[]; onChange: (next: FilterClause) => void }) {
	if (clause.field === "genre") {
		return <GenreEditor value={clause.value} onChange={(value) => onChange({ ...clause, value })} />;
	}
	if (clause.field === "popular") {
		return <BooleanEditor clause={clause} onChange={onChange} />;
	}
	if (clause.field === "type") {
		return <TypeEditor value={clause.value} onChange={(value) => onChange({ ...clause, value })} />;
	}
	if (clause.field === "tags") {
		return <TagEditor names={tagNames} value={clause.value} onChange={(value) => onChange({ ...clause, value })} />;
	}
	if (clause.field === "score" || clause.field === "year" || clause.field === "eps" || clause.field === "id") {
		return <NumericEditor clause={clause} onChange={onChange} />;
	}
	return <TextEditor label={clauseLabel(clause.field)} value={clause.value} onChange={(value) => onChange({ ...clause, value })} />;
}

function withClauseKeys(clauses: FilterClause[]): Array<{ clause: FilterClause; index: number; key: string }> {
	const seen = new Map<string, number>();
	return clauses.map((clause, index) => {
		// field only: a value in the key would remount the chip (closing its editor) on every change
		const base = clause.field;
		const n = (seen.get(base) ?? 0) + 1;
		seen.set(base, n);
		return { clause, index, key: `${base}#${n}` };
	});
}

export function ListFilterBar({ clauses, tagNames, onClausesChange }: { clauses: FilterClause[]; tagNames: string[]; onClausesChange: (next: FilterClause[]) => void }) {
	const { t } = useTranslation();
	function patch(index: number, next: FilterClause): void {
		onClausesChange(clauses.map((clause, i) => (i === index ? next : clause)));
	}

	function remove(index: number): void {
		onClausesChange(clauses.filter((_, i) => i !== index));
	}

	const chips = withClauseKeys(clauses);
	const usedFields = new Set(clauses.map((clause) => clause.field));

	return (
		<div className='flex min-w-0 flex-wrap items-center gap-1'>
			{chips.map((chip) => (
				<ListFilterChip
					key={chip.key}
					label={clauseLabel(chip.clause.field)}
					popover={chip.clause.field === "genre" || chip.clause.field === "tags"}
					value={clauseValue(chip.clause)}
					onRemove={() => {
						remove(chip.index);
					}}>
					<ClauseEditor
						clause={chip.clause}
						tagNames={tagNames}
						onChange={(next) => {
							patch(chip.index, next);
						}}
					/>
				</ListFilterChip>
			))}
			<DropdownMenu>
				<DropdownMenuTrigger render={<ButtonToggle pressed={false} onPressedChange={() => undefined} size='xs' />}>
					<PlusIcon />
					{t("list.addFilter")}
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start'>
					<DropdownMenuGroup>
						<DropdownMenuLabel>{t("list.addFilter")}</DropdownMenuLabel>
						{ADDABLE_FIELDS.map((item) => (
							<DropdownMenuItem
								key={item.field}
								disabled={usedFields.has(item.field)}
								onClick={() => {
									const next = defaultClause(item.field);
									if (item.field === "tags" && tagNames[0]) {
										next.value = tagNames[0];
									}
									onClausesChange(appendFilterClauses(clauses, [next]));
								}}>
								{item.label()}
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
					{clauses.length > 0 ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant='destructive'
								onClick={() => {
									window.setTimeout(() => {
										onClausesChange([]);
									}, 0);
								}}>
								{t("list.clearFilters")}
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
