import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, CircleAlertIcon, FilterIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import type { AnilistSeasonName, SeasonGroupBy, SeasonItem, SeasonSortBy, SeasonViewAs } from "@/lib/schemas/seasons";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { AnimeItemCommands } from "@/mainview/components/anime-item-commands";
import { PlaceholderView } from "@/mainview/components/placeholder-view";
import { Button } from "@/mainview/components/ui/button";
import { ButtonToggle } from "@/mainview/components/ui/button-toggle";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/mainview/components/ui/context-menu";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { animeMatchesListFilter } from "@/mainview/lib/anime-list-filter";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { useListFilterText } from "@/mainview/lib/list-filter";
import {
	airingBarClass,
	flattenSeasonVirtualItems,
	formatAiredRange,
	formatPopularity,
	formatScore,
	formatSeasonLabel,
	groupSeasonItems,
	imageFooterText,
	type SeasonGroup,
	seasonGridColumns,
	shiftSeason,
	sortSeasonItems,
} from "@/mainview/lib/season-view";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import type { ListStatus } from "@/shared/list";
import { listStatusSchema } from "@/shared/list";

const seasons = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;

const seasonItems = {
	WINTER: "Winter",
	SPRING: "Spring",
	SUMMER: "Summer",
	FALL: "Fall",
} as const;

const groupByItems = {
	airing: "Airing status",
	list: "List status",
	type: "Type",
} as const;

const sortByItems = {
	date: "Airing date",
	episodes: "Episodes",
	popularity: "Popularity",
	score: "Score",
	title: "Title",
} as const;

const viewAsItems = {
	tiles: "Tiles",
	images: "Images",
} as const;

const commandParts = {
	Item: ContextMenuItem,
	Sub: ContextMenuSub,
	SubTrigger: ContextMenuSubTrigger,
	SubContent: ContextMenuSubContent,
	Separator: ContextMenuSeparator,
	Shortcut: ContextMenuShortcut,
};

type SeasonLocalPrefs = {
	season?: AnilistSeasonName;
	seasonYear?: number;
	groupBy?: SeasonGroupBy;
	sortBy?: SeasonSortBy;
	viewAs?: SeasonViewAs;
};

function currentSeason(): {
	season: AnilistSeasonName;
	seasonYear: number;
} {
	const now = new Date();
	const month = now.getMonth();
	const year = now.getFullYear();
	if (month <= 2) {
		return { season: "WINTER", seasonYear: year };
	}
	if (month <= 5) {
		return { season: "SPRING", seasonYear: year };
	}
	if (month <= 8) {
		return { season: "SUMMER", seasonYear: year };
	}
	return { season: "FALL", seasonYear: year };
}

export const Route = createFileRoute("/app/seasons")({
	validateSearch: animeInfoSearchSchema,
	component: SeasonsPage,
});

function SeasonsPage() {
	const fallback = useMemo(() => currentSeason(), []);
	const settingsQuery = trpc.settings.get.useQuery();
	const utils = trpc.useUtils();
	const setSettings = trpc.settings.set.useMutation({
		onSuccess: (settings) => {
			utils.settings.get.setData(undefined, settings);
		},
	});
	const [local, setLocal] = useState<SeasonLocalPrefs>({});
	const [refreshing, setRefreshing] = useState(false);
	const [showAdult, setShowAdult] = useState(false);
	const listFilter = useListFilterText();
	const animeInfo = useAnimeInfoNav();
	const settings = settingsQuery.data;

	const season = local.season ?? settings?.seasonsLastSeason ?? fallback.season;
	const seasonYear = local.seasonYear ?? settings?.seasonsLastYear ?? fallback.seasonYear;
	const groupBy = local.groupBy ?? settings?.seasonsGroupBy ?? "airing";
	const sortBy = local.sortBy ?? settings?.seasonsSortBy ?? "date";
	const viewAs = local.viewAs ?? settings?.seasonsViewAs ?? "tiles";
	const ready = !settingsQuery.isLoading;

	const query = trpc.anilist.season.useQuery({ season, seasonYear, forceRefresh: false }, { enabled: ready });
	const idsQuery = trpc.anime.listed.useQuery(undefined, { enabled: ready });
	const localById = useMemo(() => {
		const map = new Map<number, ListStatus>();
		for (const row of idsQuery.data ?? []) {
			const status = listStatusSchema.safeParse(row.status);
			if (!status.success) {
				continue;
			}
			map.set(row.id, status.data);
		}
		return map;
	}, [idsQuery.data]);
	const inListIds = useMemo(() => new Set(localById.keys()), [localById]);

	const addFromSearch = trpc.anilist.addFromSearch.useMutation({
		onSuccess: (_data, variables) => {
			void invalidateAnimeQueries(utils, "added", variables.mediaId);
		},
	});

	function openSeasonInfo(item: SeasonItem) {
		animeInfo.open({ id: item.id });
	}

	async function refreshSeason() {
		setRefreshing(true);
		try {
			const data = await utils.anilist.season.fetch({
				season,
				seasonYear,
				forceRefresh: true,
			});
			utils.anilist.season.setData({ season, seasonYear, forceRefresh: false }, data);
		} finally {
			setRefreshing(false);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshSeason is a render function; F5 should not resubscribe every render
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "F5") {
				event.preventDefault();
				void refreshSeason();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	function persistPrefs(next: SeasonLocalPrefs) {
		const merged = { ...local, ...next };
		setLocal(merged);
		if (!settings) {
			return;
		}
		void setSettings.mutateAsync({
			seasonsGroupBy: merged.groupBy ?? groupBy,
			seasonsSortBy: merged.sortBy ?? sortBy,
			seasonsViewAs: merged.viewAs ?? viewAs,
			seasonsLastSeason: merged.season ?? season,
			seasonsLastYear: merged.seasonYear ?? seasonYear,
		});
	}

	const filtered = useMemo(() => {
		const raw = query.data?.items ?? [];
		return raw.filter((item) => {
			if (!showAdult && item.isAdult) {
				return false;
			}
			return animeMatchesListFilter(
				{
					title: item.title ?? "",
					type: item.format ?? "",
					season: formatSeasonLabel(item.season, item.seasonYear),
					id: item.id,
					episodes: item.episodes,
					score: item.averageScore,
					genres: (item.genres ?? []).join(", "),
				},
				listFilter,
			);
		});
	}, [query.data?.items, listFilter, showAdult]);

	const groups = useMemo(() => {
		const sorted = sortSeasonItems(filtered, sortBy);
		return groupSeasonItems({
			items: sorted,
			groupBy,
			inListIds,
		});
	}, [filtered, sortBy, groupBy, inListIds]);

	const busy = query.isFetching || refreshing;

	return (
		<div className='flex h-full min-h-0 flex-col'>
			<div className='flex shrink-0 flex-wrap items-center gap-2 border-b bg-card px-3 py-2'>
				<Button
					type='button'
					size='icon-sm'
					variant='outline'
					aria-label='Previous season'
					onClick={() => {
						persistPrefs(shiftSeason(season, seasonYear, -1));
					}}>
					<ChevronLeftIcon />
				</Button>
				<Select
					value={season}
					items={seasonItems}
					onValueChange={(value) => {
						if (typeof value === "string") {
							persistPrefs({ season: value as AnilistSeasonName });
						}
					}}>
					<SelectTrigger id='season' size='sm' aria-label='Season'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{seasons.map((item) => (
								<SelectItem key={item} value={item}>
									{seasonItems[item]}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<input
					id='season-year'
					type='number'
					className='h-8 w-20 rounded-md border bg-background px-2 text-sm'
					aria-label='Year'
					value={seasonYear}
					onChange={(event) => {
						const next = Number.parseInt(event.target.value, 10);
						if (!Number.isFinite(next) || next < 1900 || next > 2100) {
							return;
						}
						persistPrefs({ seasonYear: next });
					}}
				/>
				<Button
					type='button'
					size='icon-sm'
					variant='outline'
					aria-label='Next season'
					onClick={() => {
						persistPrefs(shiftSeason(season, seasonYear, 1));
					}}>
					<ChevronRightIcon />
				</Button>
				<Button
					type='button'
					size='icon-sm'
					variant='outline'
					aria-label='Refresh season'
					disabled={busy}
					onClick={() => {
						void refreshSeason();
					}}>
					<RefreshCwIcon className={busy ? "animate-spin" : undefined} />
				</Button>
				<label className='ml-2 text-xs text-muted-foreground' htmlFor='season-group'>
					Group
				</label>
				<Select
					value={groupBy}
					items={groupByItems}
					onValueChange={(value) => {
						if (typeof value === "string") {
							persistPrefs({ groupBy: value as SeasonGroupBy });
						}
					}}>
					<SelectTrigger id='season-group' size='sm'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{(Object.keys(groupByItems) as SeasonGroupBy[]).map((value) => (
								<SelectItem key={value} value={value}>
									{groupByItems[value]}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<label className='text-xs text-muted-foreground' htmlFor='season-sort'>
					Sort
				</label>
				<Select
					value={sortBy}
					items={sortByItems}
					onValueChange={(value) => {
						if (typeof value === "string") {
							persistPrefs({ sortBy: value as SeasonSortBy });
						}
					}}>
					<SelectTrigger id='season-sort' size='sm'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{(Object.keys(sortByItems) as SeasonSortBy[]).map((value) => (
								<SelectItem key={value} value={value}>
									{sortByItems[value]}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<label className='text-xs text-muted-foreground' htmlFor='season-view'>
					View
				</label>
				<Select
					value={viewAs}
					items={viewAsItems}
					onValueChange={(value) => {
						if (typeof value === "string") {
							persistPrefs({ viewAs: value as SeasonViewAs });
						}
					}}>
					<SelectTrigger id='season-view' size='sm'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{(Object.keys(viewAsItems) as SeasonViewAs[]).map((value) => (
								<SelectItem key={value} value={value}>
									{viewAsItems[value]}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<ButtonToggle size='sm' pressed={showAdult} onPressedChange={setShowAdult} aria-label='Show adult content'>
					Adult
				</ButtonToggle>
				<p className='ml-auto text-xs text-muted-foreground'>
					{filtered.length} title{filtered.length === 1 ? "" : "s"}
					{query.data?.fromCache ? " · cached" : ""}
				</p>
			</div>
			<ScrollArea className='h-full flex-1'>
				{!ready || (query.isPending && !query.data) ? <SeasonGridSkeleton viewAs={viewAs} /> : null}
				{query.error ? <PlaceholderView icon={CircleAlertIcon} title='Could not load season' description={query.error.message} /> : null}
				{query.data && (query.data.items?.length ?? 0) === 0 ? <PlaceholderView icon={CalendarDaysIcon} title='No titles' description='Nothing listed for this season.' /> : null}
				{query.data && (query.data.items?.length ?? 0) > 0 && filtered.length === 0 ? (
					<PlaceholderView icon={FilterIcon} title='No matches' description='Nothing matched the list filter.' />
				) : null}
				{groups.length > 0 ? (
					<SeasonVirtualGrid
						groups={groups}
						viewAs={viewAs}
						sortBy={sortBy}
						localById={localById}
						onOpen={openSeasonInfo}
						onAdd={(item) => {
							void addFromSearch.mutateAsync({ mediaId: item.id });
						}}
						adding={addFromSearch.isPending}
					/>
				) : null}
			</ScrollArea>
		</div>
	);
}

function SeasonGridSkeleton({ viewAs }: { viewAs: SeasonViewAs }) {
	if (viewAs === "images") {
		return (
			<ul className='grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
				{["i0", "i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10", "i11"].map((id) => (
					<li key={id}>
						<Skeleton className='aspect-2/3 w-full rounded-md' />
					</li>
				))}
			</ul>
		);
	}
	return (
		<ul className='grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3'>
			{["t0", "t1", "t2", "t3", "t4", "t5"].map((id) => (
				<li key={id}>
					<Skeleton className='h-44 w-full rounded-md' />
				</li>
			))}
		</ul>
	);
}

function SeasonVirtualGrid({
	groups,
	viewAs,
	sortBy,
	localById,
	onOpen,
	onAdd,
	adding,
}: {
	groups: SeasonGroup[];
	viewAs: SeasonViewAs;
	sortBy: SeasonSortBy;
	localById: Map<number, ListStatus>;
	onOpen: (item: SeasonItem) => void;
	onAdd: (item: SeasonItem) => void;
	adding: boolean;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	useEffect(() => {
		const node = rootRef.current;
		if (!node) {
			return;
		}
		const observer = new ResizeObserver((entries) => {
			setWidth(entries[0]?.contentRect.width ?? 0);
		});
		observer.observe(node);
		setWidth(node.clientWidth);
		return () => {
			observer.disconnect();
		};
	}, []);
	const columns = seasonGridColumns(viewAs, width || 640);
	const items = flattenSeasonVirtualItems(groups, columns);
	const gap = 12;
	const rowPad = viewAs === "images" ? 16 : 12;
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => rootRef.current?.closest("[data-slot=scroll-area-viewport]") ?? null,
		estimateSize: (index) => {
			const item = items[index];
			if (!item || item.type === "header") {
				return 40;
			}
			if (viewAs === "images") {
				const colWidth = Math.max(80, ((width || 640) - rowPad * 2 - gap * (columns - 1)) / columns);
				return colWidth * 1.5 + gap;
			}
			return 220;
		},
		overscan: 4,
		measureElement: (element) => element.getBoundingClientRect().height,
	});
	return (
		<div ref={rootRef} className='relative w-full' style={{ height: virtualizer.getTotalSize() }}>
			{virtualizer.getVirtualItems().map((virtualRow) => {
				const item = items[virtualRow.index];
				if (!item) {
					return null;
				}
				return (
					<div
						key={item.key}
						data-index={virtualRow.index}
						ref={virtualizer.measureElement}
						className='absolute top-0 left-0 w-full'
						style={{ transform: `translateY(${virtualRow.start}px)` }}>
						{item.type === "header" ? (
							<h2 className='border-b bg-muted/90 px-4 py-2 text-sm font-medium'>
								{item.label}
								<span className='ml-2 text-muted-foreground'>({item.count})</span>
							</h2>
						) : (
							<ul className={viewAs === "images" ? "grid gap-3 p-4" : "grid gap-3 p-3"} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
								{item.items.map((card) => (
									<li key={card.id}>
										<SeasonCard
											item={card}
											viewAs={viewAs}
											sortBy={sortBy}
											listStatus={localById.get(card.id) ?? null}
											onOpen={() => onOpen(card)}
											onAdd={() => onAdd(card)}
											adding={adding}
										/>
									</li>
								))}
							</ul>
						)}
					</div>
				);
			})}
		</div>
	);
}

function SeasonCard(props: {
	item: SeasonItem;
	viewAs: SeasonViewAs;
	sortBy: SeasonSortBy;
	listStatus: ListStatus | null;
	onOpen: () => void;
	onAdd: () => void;
	adding: boolean;
}) {
	const { item, viewAs, sortBy, listStatus, onOpen, onAdd, adding } = props;
	const bar = airingBarClass(item.status);
	const inList = listStatus != null;

	return (
		<ContextMenu>
			<ContextMenuTrigger
				className={
					viewAs === "images"
						? cn(
								"group relative block aspect-2/3 cursor-pointer overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10",
								"transition-shadow duration-150",
								"hover:ring-foreground/25 active:scale-[0.99]",
							)
						: cn("group flex w-full cursor-pointer gap-3 rounded-md border bg-card p-2 ring-1 ring-transparent", "transition-shadow duration-150 hover:ring-foreground/15")
				}
				onClick={onOpen}>
				{viewAs === "images" ? (
					<>
						<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' className='size-full' lazy />
						<div className='absolute inset-x-0 bottom-0 flex flex-col'>
							{inList ? (
								<div className='bg-black/70 px-2 py-1 text-center text-[10px] font-medium text-white backdrop-blur-[2px]'>
									<span className='block truncate'>{listStatus}</span>
								</div>
							) : null}
							<div className={cn("flex items-center justify-center px-2 py-1.5 text-xs font-medium", bar)}>
								<span className='min-w-0 truncate text-center'>{imageFooterText(item, sortBy)}</span>
							</div>
						</div>
					</>
				) : (
					<>
						<div className='flex w-28 shrink-0 flex-col gap-1.5'>
							<div className='relative aspect-2/3 w-full overflow-hidden rounded-sm bg-muted'>
								<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' className='size-full' lazy />
							</div>
							{inList ? (
								<span className='block truncate rounded-md border px-2 py-1 text-center text-xs text-muted-foreground'>{listStatus}</span>
							) : (
								<Button
									type='button'
									size='sm'
									variant='secondary'
									className='w-full'
									disabled={adding}
									onClick={(event) => {
										event.stopPropagation();
										onAdd();
									}}>
									Add to list
								</Button>
							)}
						</div>
						<div className='min-w-0 flex-1 text-left'>
							<div className={cn("mb-2 flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-semibold", bar)}>
								<span className='min-w-0 flex-1 truncate'>{item.title}</span>
							</div>
							<div className='grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs'>
								<span className='text-muted-foreground'>Aired:</span>
								<span className='truncate'>{formatAiredRange(item)}</span>
								<span className='text-muted-foreground'>Episodes:</span>
								<span>{item.episodes > 0 ? item.episodes : "Unknown"}</span>
								<span className='text-muted-foreground'>Genres:</span>
								<span className='truncate'>{item.genres.length > 0 ? item.genres.join(", ") : "?"}</span>
								<span className='text-muted-foreground'>Producers:</span>
								<span className='truncate'>{item.producers.length > 0 ? item.producers.join(", ") : "?"}</span>
								<span className='text-muted-foreground'>Score:</span>
								<span>{formatScore(item.averageScore)}</span>
								<span className='text-muted-foreground'>Popularity:</span>
								<span>{formatPopularity(item.popularity)}</span>
							</div>
							{item.synopsis ? <p className='mt-2 line-clamp-3 text-xs text-muted-foreground'>{item.synopsis}</p> : null}
						</div>
					</>
				)}
			</ContextMenuTrigger>
			<ContextMenuContent className='min-w-56'>
				<AnimeItemCommands
					parts={commandParts}
					mode='discover'
					discover={{
						id: item.id,
						title: item.title,
						episodes: item.episodes,
						trailerId: item.trailerId,
						listStatus,
					}}
					onInformation={onOpen}
				/>
			</ContextMenuContent>
		</ContextMenu>
	);
}
