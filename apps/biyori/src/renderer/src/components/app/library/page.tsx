import { useTranslation } from "@biyori/translations/react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { ArrowUpDownIcon, ChevronLeftIcon, FolderIcon, FolderSearchIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { desktopRpc } from "@/desktop-rpc";
import type { RootFolderRow } from "@/lib/library-summary";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { ListPicker } from "@/mainview/components/app/library/list-picker";
import { CategoryNav } from "@/mainview/components/app/shared/category-nav";
import { PosterWall } from "@/mainview/components/app/shared/poster-wall";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/mainview/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/mainview/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { Field, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";

const route = getRouteApi("/app/library_/$root");
type StatusTab = "all" | "unmatched" | "matched" | "ignored";
type SortKey = "name" | "files";
const STATUS_TABS: StatusTab[] = ["all", "unmatched", "matched", "ignored"];

function tabMatches(tab: StatusTab, row: RootFolderRow): boolean {
	return tab === "all" || (tab === "matched" ? row.status === "matched" || row.status === "multiple" : row.status === tab);
}
const EMPTY_ROWS: RootFolderRow[] = [];
const TILE_WIDTH = 112;
// cover 2:3 + name (2 lines) + status line + row gap
const ROW_HEIGHT = 168 + 6 + 32 + 16 + 14;

function FolderTile({ row, onOpen }: { row: RootFolderRow; onOpen: () => void }) {
	const { t } = useTranslation();
	const first = row.owners[0];
	const subtitle =
		row.status === "unmatched"
			? t("library.notMatched")
			: row.status === "ignored"
				? t("library.ignored")
				: row.status === "multiple"
					? t("library.multipleAnime", { count: row.owners.length })
					: (first?.title ?? "");
	return (
		<button type='button' onClick={onOpen} className='group flex w-28 flex-col rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50' title={row.path}>
			<div
				className={cn(
					"relative aspect-2/3 w-full overflow-hidden rounded-md ring-1 ring-foreground/10 transition-shadow duration-150 group-hover:ring-foreground/25",
					first ? "bg-muted" : "flex items-center justify-center border border-dashed text-muted-foreground",
					row.status === "ignored" && "opacity-50",
				)}>
				{first ? <AnimeCover id={first.animeId} coverUrl={first.coverUrl} alt='' lazy className='size-full' /> : row.status === "ignored" ? null : <PlusIcon className='size-6' />}
				<span className='absolute right-1.5 bottom-1.5 rounded-full bg-black/60 px-1.5 text-[11px] text-white tabular-nums'>{row.files}</span>
			</div>
			<span className='mt-1.5 line-clamp-2 text-xs leading-snug'>{row.name}</span>
			<span className={cn("w-full truncate text-[11px]", row.status === "unmatched" ? "text-amber-400" : "text-muted-foreground")}>{subtitle}</span>
		</button>
	);
}

const NO_IDS: ReadonlySet<number> = new Set();

function optionalInt(value: string): number | null {
	return value.trim() === "" ? null : Math.trunc(Number(value));
}

function ruleSummary(rule: RootFolderRow["rules"][number], range: string): string {
	const season = rule.season == null ? "" : `S${String(rule.season).padStart(2, "0")} · `;
	const offset = rule.offset === 0 ? "" : ` (${rule.offset > 0 ? "+" : ""}${rule.offset})`;
	return `${season}${range}${offset}`;
}

function RuleForm({ path, onDone }: { path: string; onDone: () => void }) {
	const { t } = useTranslation();
	const add = trpc.library.addFolderRule.useMutation();
	const [season, setSeason] = useState("");
	const [from, setFrom] = useState("1");
	const [to, setTo] = useState("");
	const [offset, setOffset] = useState("0");
	const fromValue = optionalInt(from) ?? 1;
	const toValue = optionalInt(to);
	const invalidRange = toValue != null && toValue < fromValue;
	const fields = [
		{ id: "season", label: t("library.rule.season"), placeholder: t("library.rule.seasonHint"), value: season, set: setSeason, min: 0 },
		{ id: "from", label: t("library.rule.from"), placeholder: "1", value: from, set: setFrom, min: 0 },
		{ id: "to", label: t("library.rule.to"), placeholder: t("library.rule.toHint"), value: to, set: setTo, min: 0 },
		{ id: "offset", label: t("library.rule.offset"), placeholder: "0", value: offset, set: setOffset, min: undefined },
	];
	return (
		<>
			<div className='grid grid-cols-2 gap-2'>
				{fields.map((field) => (
					<Field key={field.id}>
						<FieldLabel htmlFor={`rule-${field.id}`}>{field.label}</FieldLabel>
						<Input
							id={`rule-${field.id}`}
							type='number'
							inputMode='numeric'
							min={field.min}
							value={field.value}
							placeholder={field.placeholder}
							onChange={(event) => field.set(event.target.value)}
						/>
					</Field>
				))}
			</div>
			{invalidRange ? <p className='text-sm text-destructive'>{t("library.rule.invalidRange")}</p> : null}
			{add.error ? <p className='text-sm text-destructive'>{add.error.message}</p> : null}
			<p className='text-xs text-muted-foreground'>{t("library.rule.pick")}</p>
			<ListPicker
				path={path}
				excludeIds={NO_IDS}
				pending={add.isPending || invalidRange}
				onPick={(animeId) => {
					add.mutate({ path, season: optionalInt(season), from: fromValue, to: toValue, offset: optionalInt(offset) ?? 0, animeId }, { onSuccess: onDone });
				}}
			/>
		</>
	);
}

function FolderRules({ row, adding, setAdding }: { row: RootFolderRow; adding: boolean; setAdding: (next: boolean) => void }) {
	const { t } = useTranslation();
	const remove = trpc.library.removeFolderRule.useMutation();
	return (
		<div className='flex flex-col gap-2'>
			<div className='flex items-center justify-between gap-2'>
				<p className='text-xs text-muted-foreground'>{t("library.rule.title")}</p>
				<Button type='button' variant='ghost' size='xs' onClick={() => setAdding(!adding)}>
					{adding ? t("library.rule.cancel") : t("library.rule.add")}
				</Button>
			</div>
			{row.rules.length === 0 && !adding ? <p className='text-xs text-muted-foreground'>{t("library.rule.hint")}</p> : null}
			{row.rules.length > 0 ? (
				<ul className='flex flex-col gap-1'>
					{row.rules.map((rule) => (
						<li key={rule.id} className='flex items-center gap-2 text-sm'>
							<span className='shrink-0 text-muted-foreground tabular-nums'>{ruleSummary(rule, t("library.rule.range", { from: rule.from, to: rule.to ?? "…" }))}</span>
							<span className='min-w-0 flex-1 truncate'>→ {rule.title}</span>
							<Button
								type='button'
								variant='ghost'
								size='xs'
								loading={remove.isPending}
								onClick={() => {
									remove.mutate({ id: rule.id });
								}}>
								{t("library.remove")}
							</Button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

function FolderDrawer({ row }: { row: RootFolderRow }) {
	const { t } = useTranslation();
	const remove = trpc.library.removeFolderOwner.useMutation();
	const clear = trpc.library.clearFolder.useMutation();
	const unignore = trpc.library.unignoreFolder.useMutation();
	const [addingRule, setAddingRule] = useState(false);
	const ownerIds = new Set(row.owners.map((owner) => owner.animeId));
	return (
		<>
			<DialogTitle className='truncate pr-8'>{row.name}</DialogTitle>
			<p className='text-muted-foreground'>
				{t("library.folderStats", { files: row.files, episodes: row.episodes })}
				{" · "}
				<button
					type='button'
					className='underline underline-offset-2'
					onClick={() => {
						void desktopRpc.request.openPath({ path: row.path });
					}}>
					{t("library.openRoot")}
				</button>
			</p>
			<div>
				<p className='mb-1.5 text-xs text-muted-foreground'>{t("library.matchedAnime")}</p>
				{row.owners.length === 0 ? (
					<p className='text-muted-foreground'>{t("library.noneYet")}</p>
				) : (
					<ul className='flex flex-col gap-2'>
						{row.owners.map((owner) => (
							<li key={owner.animeId} className='flex items-center gap-3'>
								<AnimeCover id={owner.animeId} coverUrl={owner.coverUrl} alt='' lazy className='h-16 w-11 shrink-0 overflow-hidden rounded-sm' />
								<span className='min-w-0 flex-1'>
									<span className='block truncate'>{owner.title}</span>
									{owner.onList ? null : <Badge variant='secondary'>{t("library.notOnList")}</Badge>}
								</span>
								<Button
									type='button'
									variant='ghost'
									size='xs'
									loading={remove.isPending}
									onClick={() => {
										remove.mutate({ path: row.path, animeId: owner.animeId });
									}}>
									{t("library.remove")}
								</Button>
							</li>
						))}
					</ul>
				)}
			</div>
			{row.status === "ignored" ? null : (
				<>
					<FolderRules row={row} adding={addingRule} setAdding={setAddingRule} />
					{addingRule ? (
						<RuleForm path={row.path} onDone={() => setAddingRule(false)} />
					) : (
						<>
							<p className='text-xs text-muted-foreground'>{t("library.addFromList")}</p>
							<ListPicker path={row.path} excludeIds={ownerIds} />
						</>
					)}
				</>
			)}
			<div className='flex items-center justify-between gap-2'>
				<span className='text-xs text-muted-foreground'>
					{t("library.notOnListHint")}{" "}
					<Link to='/app/search' className='underline underline-offset-2'>
						{t("library.searchLink")}
					</Link>
				</span>
				<span className='flex shrink-0 gap-1'>
					{row.status === "ignored" ? (
						<Button
							type='button'
							variant='ghost'
							size='xs'
							loading={unignore.isPending}
							onClick={() => {
								unignore.mutate({ path: row.path });
							}}>
							{t("library.unignore")}
						</Button>
					) : (
						<>
							{row.owners.length > 0 ? (
								<Button
									type='button'
									variant='ghost'
									size='xs'
									loading={clear.isPending}
									onClick={() => {
										clear.mutate({ path: row.path, ignore: false });
									}}>
									{t("library.rematch")}
								</Button>
							) : null}
							<Button
								type='button'
								variant='ghost'
								size='xs'
								loading={clear.isPending}
								onClick={() => {
									clear.mutate({ path: row.path, ignore: true });
								}}>
								{t("library.ignoreFolder")}
							</Button>
						</>
					)}
				</span>
			</div>
		</>
	);
}

export function LibraryRootPage() {
	const { t } = useTranslation();
	const { root } = route.useParams();
	const query = trpc.library.folders.useQuery({ root });
	const scanFolder = trpc.library.scanFolder.useMutation();
	const [filter, setFilter] = useState("");
	const [tab, setTab] = useState<StatusTab>("all");
	const [sort, setSort] = useState<SortKey>("name");
	const [selected, setSelected] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const data = query.data;
	const rows = data?.folders ?? EMPTY_ROWS;
	const needle = filter.trim().toLowerCase();
	const visible = rows.filter((row) => tabMatches(tab, row) && (!needle || row.name.toLowerCase().includes(needle)));
	if (sort === "files") {
		visible.sort((a, b) => b.files - a.files);
	}
	const tabs = STATUS_TABS.map((id) => ({ id, label: `${t(`library.tab.${id}`)} ${rows.filter((row) => tabMatches(id, row)).length}` }));
	const missing = data?.missing ?? false;
	// keep the last row while the drawer animates out
	const selectedRow = rows.find((row) => row.path === selected) ?? null;

	return (
		<div className='flex h-full min-h-0 flex-col gap-3 pt-4'>
			<div className='flex flex-wrap items-start justify-between gap-3 px-4'>
				<div className='flex min-w-0 items-start gap-2'>
					<Button type='button' variant='ghost' size='icon-xs' className='mt-1' aria-label={t("library.back")} render={<Link to='/app/library' />}>
						<ChevronLeftIcon />
					</Button>
					<div className='min-w-0'>
						<h1 className='truncate text-lg font-semibold'>{data?.name ?? root}</h1>
						<p className='truncate text-sm text-muted-foreground'>{root}</p>
					</div>
				</div>
			</div>
			<div className='flex flex-wrap items-center gap-2 border-b px-4 pb-3'>
				<div className='rounded-lg border border-border/60 p-0.5'>
					<CategoryNav
						items={tabs}
						value={tab}
						onValueChange={(id) => setTab(id as StatusTab)}
						aria-label={t("library.status")}
						layoutId='library-folder-tabs'
						arrows={false}
						compact
					/>
				</div>
				<span className='flex-1' />
				<Input className='w-52' value={filter} placeholder={t("library.filterFolders")} onChange={(event) => setFilter(event.target.value)} />
				<DropdownMenu>
					<DropdownMenuTrigger render={<Button type='button' variant='ghost' aria-label={t("library.sortBy")} />}>
						<ArrowUpDownIcon data-icon='inline-start' />
						{t(sort === "name" ? "library.name" : "library.files")}
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end'>
						<DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(value as SortKey)}>
							<DropdownMenuRadioItem value='name'>{t("library.name")}</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value='files'>{t("library.files")}</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
				<div className='flex flex-wrap gap-2'>
					<Button
						type='button'
						variant='outline'
						loading={scanFolder.isPending}
						disabled={missing}
						onClick={() => {
							scanFolder.mutate({ path: root });
						}}>
						<FolderSearchIcon data-icon='inline-start' />
						{t("library.scanFolders")}
					</Button>
				</div>
			</div>
			{query.isPending ? (
				<Skeleton className='mx-4 h-40 rounded-xl' />
			) : missing || rows.length === 0 ? (
				<Empty className='mx-4 min-h-40 border border-dashed'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<FolderIcon />
						</EmptyMedia>
						<EmptyTitle>{missing ? t("library.folderMissing") : t("library.noSeriesFolders")}</EmptyTitle>
						{missing ? null : <EmptyDescription>{t("library.noSeriesFoldersHint")}</EmptyDescription>}
					</EmptyHeader>
				</Empty>
			) : (
				<ScrollArea className='min-h-0 flex-1' viewportClassName='px-4 pt-1 pb-4'>
					<PosterWall
						items={visible}
						getKey={(row) => row.path}
						tileWidth={TILE_WIDTH}
						rowHeight={ROW_HEIGHT}
						renderTile={(row) => (
							<FolderTile
								row={row}
								onOpen={() => {
									setSelected(row.path);
									setOpen(true);
								}}
							/>
						)}
					/>
				</ScrollArea>
			)}
			<Dialog open={open && selectedRow != null} onOpenChange={setOpen}>
				<DialogContent from='right' className='flex flex-col gap-3'>
					{selectedRow ? <FolderDrawer key={selectedRow.path} row={selectedRow} /> : null}
				</DialogContent>
			</Dialog>
		</div>
	);
}
