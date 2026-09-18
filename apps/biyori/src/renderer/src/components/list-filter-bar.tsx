import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";
import { ListFilterChip } from "@/mainview/components/list-filter-chip";
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
import { appendFilterClauses, type FilterClause, formatSearchOperator, type SearchOperator } from "@/mainview/lib/anime-list-filter";

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

const ADDABLE_FIELDS: Array<{ field: FilterClause["field"]; label: string }> = [
	{ field: "genre", label: "Genre" },
	{ field: "tags", label: "Tags" },
	{ field: "score", label: "Score" },
	{ field: "popular", label: "Popular" },
	{ field: "type", label: "Type" },
	{ field: "year", label: "Year" },
];

function clauseLabel(field: FilterClause["field"]): string {
	switch (field) {
		case "genre":
			return "Genre";
		case "tags":
			return "Tags";
		case "score":
			return "Score";
		case "popular":
			return "Popular";
		case "type":
			return "Type";
		case "year":
			return "Year";
		case "eps":
			return "Eps";
		case "id":
			return "Id";
		case "title":
			return "Title";
		case "note":
			return "Note";
		case "season":
			return "Season";
		default:
			return field;
	}
}

function clauseValue(clause: FilterClause): string {
	if (clause.field === "popular") {
		return clause.value.trim().toLowerCase() === "false" ? "No" : "Yes";
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

function groupLetter(name: string): string {
	const ch = [...name.trim()][0];
	if (!ch) {
		return "#";
	}
	return /\p{L}/u.test(ch) ? ch.toLocaleUpperCase() : "#";
}

function groupByFirstLetter(names: readonly string[]): Array<{ letter: string; items: string[] }> {
	const buckets = new Map<string, string[]>();
	for (const name of names) {
		const letter = groupLetter(name);
		const items = buckets.get(letter);
		if (items) {
			items.push(name);
		} else {
			buckets.set(letter, [name]);
		}
	}
	return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })).map(([letter, items]) => ({ letter, items }));
}

function NamedListEditor({ label, names, value, empty, onChange }: { label: string; names: readonly string[]; value: string; empty: string; onChange: (next: string) => void }) {
	const searchId = useId();
	const [query, setQuery] = useState("");
	const needle = query.trim().toLowerCase();
	const filtered = needle ? names.filter((name) => name.toLowerCase().includes(needle)) : names;
	const groups = groupByFirstLetter(filtered);
	const selected = new Set(splitCsv(value).map((item) => item.toLowerCase()));

	return (
		<div className='flex max-h-80 min-h-0 flex-col'>
			<div className='shrink-0 border-b p-1 mb-0'>
				<label className='sr-only' htmlFor={searchId}>
					Search {label.toLowerCase()}
				</label>
				<Input
					id={searchId}
					autoFocus
					value={query}
					placeholder={`Search ${label.toLowerCase()}`}
					onKeyDown={(event) => {
						if (event.key !== "Escape") {
							event.stopPropagation();
						}
					}}
					onChange={(event) => {
						setQuery(event.target.value);
					}}
				/>
			</div>
			<ScrollArea className='min-h-0 max-h-72' viewportClassName='min-h-0 max-h-72 w-full outline-none focus-visible:ring-0'>
				<div className='px-1 pb-2'>
					{names.length === 0 ? <p className='px-1.5 py-1 text-xs text-muted-foreground'>{empty}</p> : null}
					{names.length > 0 && filtered.length === 0 ? <p className='px-1.5 py-1 text-xs text-muted-foreground'>No matches</p> : null}
					{groups.map((group) => (
						<DropdownMenuGroup key={group.letter}>
							<DropdownMenuLabel className='sticky top-0 z-10 flex h-7 bg-popover leading-6'>{group.letter}</DropdownMenuLabel>
							{group.items.map((name) => {
								const checked = selected.has(name.toLowerCase());
								return (
									<DropdownMenuCheckboxItem
										key={name}
										checked={checked}
										onCheckedChange={(next) => {
											const current = splitCsv(value);
											if (next) {
												onChange([...current, name].join(","));
												return;
											}
											onChange(current.filter((item) => item.toLowerCase() !== name.toLowerCase()).join(","));
										}}>
										{name}
									</DropdownMenuCheckboxItem>
								);
							})}
						</DropdownMenuGroup>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}

function TypeEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
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
				<DropdownMenuLabel>Type</DropdownMenuLabel>
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
							{type}
						</DropdownMenuCheckboxItem>
					);
				})}
			</DropdownMenuGroup>
		</div>
	);
}

function GenreEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
	return <NamedListEditor label='Genres' names={ANIME_GENRES} value={value} empty='No genres' onChange={onChange} />;
}

function TagEditor({ value, names, onChange }: { value: string; names: string[]; onChange: (next: string) => void }) {
	return <NamedListEditor label='Tags' names={names} value={value} empty='No tags yet. Sync AniList to fill them.' onChange={onChange} />;
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
				Value
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
	const selected = clause.value.trim().toLowerCase() === "false" ? "false" : "true";
	return (
		<div className='p-1'>
			<DropdownMenuGroup>
				<DropdownMenuLabel>Most popular</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={selected}
					onValueChange={(value) => {
						onChange({ ...clause, op: "eq", value });
					}}>
					<DropdownMenuRadioItem value='true'>Yes</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value='false'>No</DropdownMenuRadioItem>
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
		const base = `${clause.field}:${clause.op}:${clause.value}`;
		const n = (seen.get(base) ?? 0) + 1;
		seen.set(base, n);
		return { clause, index, key: `${base}#${n}` };
	});
}

export function ListFilterBar({
	clauses,
	tagNames,
	onClausesChange,
	onMenuOpenChange,
}: {
	clauses: FilterClause[];
	tagNames: string[];
	onClausesChange: (next: FilterClause[]) => void;
	onMenuOpenChange?: (open: boolean) => void;
}) {
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
					value={clauseValue(chip.clause)}
					onMenuOpenChange={onMenuOpenChange}
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
			<DropdownMenu onOpenChange={onMenuOpenChange}>
				<DropdownMenuTrigger render={<ButtonToggle pressed={false} onPressedChange={() => undefined} size='xs' />}>
					<PlusIcon />
					Add filter
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start'>
					<DropdownMenuGroup>
						<DropdownMenuLabel>Add filter</DropdownMenuLabel>
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
								{item.label}
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
								Clear filters
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
