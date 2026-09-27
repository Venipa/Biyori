import { createFileRoute } from "@tanstack/react-router";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, CircleAlertIcon, FilterIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import type { AnilistSeasonName, SeasonGroupBy, SeasonItem, SeasonSortBy, SeasonViewAs } from "@/lib/schemas/seasons";
import { SeasonGridSkeleton } from "@/mainview/components/app/seasons/grid-skeleton";
import { SeasonVirtualGrid } from "@/mainview/components/app/seasons/virtual-grid";
import { PlaceholderView } from "@/mainview/components/app/shared/placeholder-view";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/mainview/components/ui/dropdown-menu";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { animeMatchesListFilter } from "@/mainview/lib/anime-list-filter";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { useListFilterText } from "@/mainview/lib/list-filter";
import { formatSeasonLabel, groupSeasonItems, shiftSeason, sortSeasonItems } from "@/mainview/lib/season-view";
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
	date: "Release date",
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
	guide: "Guide",
	skyline: "Skyline",
} as const;

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
		animeInfo.open({ id: item.id, infoTab: "main" });
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
			if (item.isAdult !== showAdult) {
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
					popularRank: item.popularRank,
					genres: (item.genres ?? []).join(", "),
					tags: (item.tags ?? []).join(", "),
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
	const activeFilterCount = showAdult ? 1 : 0;

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
					<SelectContent side='bottom' alignItemWithTrigger={false} collisionAvoidance={{ side: "none", fallbackAxisSide: "none" }}>
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
					<SelectContent side='bottom' alignItemWithTrigger={false} collisionAvoidance={{ side: "none", fallbackAxisSide: "none" }}>
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
					<SelectContent side='bottom' alignItemWithTrigger={false} collisionAvoidance={{ side: "none", fallbackAxisSide: "none" }}>
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
					<SelectContent side='bottom' alignItemWithTrigger={false} collisionAvoidance={{ side: "none", fallbackAxisSide: "none" }}>
						<SelectGroup>
							{(Object.keys(viewAsItems) as SeasonViewAs[]).map((value) => (
								<SelectItem key={value} value={value}>
									{viewAsItems[value]}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button type='button' size='icon-sm' variant='outline' className='relative' aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"} />
						}>
						<FilterIcon />
						{activeFilterCount > 0 ? (
							<Badge size='xs' className='absolute -top-1.5 -right-1.5 min-w-4 px-1 tabular-nums'>
								{activeFilterCount}
							</Badge>
						) : null}
					</DropdownMenuTrigger>
					<DropdownMenuContent side='bottom' align='start' collisionAvoidance={{ side: "none", fallbackAxisSide: "none" }} className='min-w-40'>
						<DropdownMenuCheckboxItem checked={showAdult} onCheckedChange={(checked) => setShowAdult(checked === true)}>
							Adult
						</DropdownMenuCheckboxItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<p className='ml-auto text-xs text-muted-foreground'>
					{filtered.length} title{filtered.length === 1 ? "" : "s"}
					{query.data?.fromCache ? " · cached" : ""}
				</p>
			</div>
			<div className='min-h-0 flex-1'>
				<ScrollArea className='h-full'>
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
		</div>
	);
}
