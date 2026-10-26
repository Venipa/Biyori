import { t, useTranslation } from "@biyori/translations/react";
import type { inferRouterOutputs } from "@trpc/server";
import { type ReactElement, type ReactNode, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { listStatusLabel } from "@/mainview/components/app/anime/list-action";
import { Panel } from "@/mainview/components/app/shared/panel";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
import { airingStatusLabel } from "@/mainview/lib/anime-airing-notice";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { animeTypeLabel, genreLabel } from "@/mainview/lib/anime-list-filter";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";

type StatisticsData = inferRouterOutputs<AppRouter>["statistics"]["summary"];
type StatisticsActivity = StatisticsData["activity"];
type StatisticsTopRated = StatisticsData["topRated"][number];

function displayStatLabel(label: string): string {
	switch (label) {
		case "Currently watching":
		case "Completed":
		case "On hold":
		case "Dropped":
		case "Plan to watch":
			return listStatusLabel(label);
		case "Currently airing":
		case "Finished airing":
		case "Finished":
		case "Not yet released":
		case "Cancelled":
		case "Hiatus":
			return airingStatusLabel(label);
		case "TV":
		case "Movie":
		case "OVA":
		case "ONA":
			return animeTypeLabel(label);
		default:
			return genreLabel(label);
	}
}

type StatsTab = "list" | "app";

// only the status donut is categorical; bar lists use one tone so the page stays quiet
const CHART_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"] as const;
const CHART_BG = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"] as const;

type StatBar = {
	label: string;
	count: number;
	ratio: number;
	total?: number;
};

function formatDuration(minutes: number): string {
	if (minutes <= 0) {
		return t("common.none");
	}
	const days = Math.floor(minutes / 1440);
	const hours = Math.floor((minutes % 1440) / 60);
	const remainingMinutes = Math.floor(minutes % 60);
	return t("statistics.duration", { days, hours, minutes: remainingMinutes });
}

function completionHint(statuses: StatBar[]): string | undefined {
	const total = statuses.reduce((sum, item) => sum + item.count, 0);
	if (total <= 0) {
		return undefined;
	}
	const share = (label: string) => Math.round(((statuses.find((item) => item.label === label)?.count ?? 0) / total) * 100);
	return t("statistics.completion", { completed: share("Completed"), dropped: share("Dropped") });
}

function formatShortDuration(minutes: number): string {
	if (minutes <= 0) {
		return t("common.none");
	}
	return t("statistics.shortDuration", { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60) });
}

function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;
	return t("statistics.uptimeValue", { days, hours, minutes, seconds: remainingSeconds });
}

function formatBytes(bytes: number): string {
	const units = ["B", "KiB", "MiB", "GiB", "TiB"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function pieBackground(items: StatBar[]): string {
	const total = items.reduce((sum, item) => sum + item.count, 0);
	if (total <= 0) {
		return "var(--muted)";
	}
	let start = 0;
	const stops: string[] = [];
	for (const [index, item] of items.entries()) {
		const span = (item.count / total) * 360;
		const color = `var(${CHART_VARS[index % CHART_VARS.length]})`;
		stops.push(`${color} ${start}deg ${start + span}deg`);
		start += span;
	}
	return `conic-gradient(${stops.join(", ")})`;
}

function StatTile({ label, value, hint, title }: { label: string; value: string | number; hint?: string; title?: string }): ReactElement {
	return (
		<div className='flex min-w-0 flex-col gap-1 rounded-lg border bg-card px-4 py-3' title={title}>
			<span className='text-xs text-muted-foreground'>{label}</span>
			<span className='truncate text-2xl font-semibold tabular-nums tracking-tight'>{value}</span>
			<span className='truncate text-xs text-muted-foreground tabular-nums'>{hint ?? " "}</span>
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: ReactNode }): ReactElement {
	return (
		<div className='flex items-baseline justify-between gap-4 py-1.5 text-sm'>
			<dt className='text-muted-foreground'>{label.replace(/:$/, "")}</dt>
			<dd className='text-right font-medium tabular-nums'>{value}</dd>
		</div>
	);
}

const COLLAPSED_ROWS = 5;

function BarList({ items, value }: { items?: StatBar[] | null; value?: (item: StatBar) => string }): ReactElement {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);
	if (!items || items.length === 0) {
		return <p className='text-sm text-muted-foreground'>{t("common.none")}</p>;
	}
	const collapsible = items.length > COLLAPSED_ROWS;
	const shownItems = collapsible && !expanded ? items.slice(0, COLLAPSED_ROWS) : items;
	return (
		<div className='flex flex-col gap-1.5'>
			{shownItems.map((item) => {
				const label = displayStatLabel(item.label);
				const shown = value?.(item) ?? String(item.count);
				return (
					<div key={item.label} className='grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm'>
						<span className='truncate' title={label}>
							{label}
						</span>
						<div className='h-1.5 overflow-hidden rounded-full bg-muted'>
							<div
								role='img'
								aria-label={t("statistics.barValue", { label, value: shown })}
								className='h-full rounded-full bg-primary/70'
								style={{ width: `${item.ratio * 100}%` }}
							/>
						</div>
						<span className='min-w-10 text-right tabular-nums text-muted-foreground'>{shown}</span>
					</div>
				);
			})}
			{collapsible ? (
				<button
					type='button'
					className='mt-1 self-start text-xs text-muted-foreground hover:text-foreground focus-visible:text-foreground'
					aria-expanded={expanded}
					onClick={() => {
						setExpanded((current) => !current);
					}}>
					{expanded ? t("statistics.showLess") : t("statistics.showAll", { count: items.length })}
				</button>
			) : null}
		</div>
	);
}

function ActivityStrip({ activity }: { activity: StatisticsActivity }): ReactElement {
	const { t } = useTranslation();
	return (
		<div className='flex flex-col gap-1.5'>
			<div className='flex h-20 items-end gap-1'>
				{activity.weeks.map((week) => {
					const label = t("statistics.activityWeek", { date: new Date(week.start).toLocaleDateString(), count: week.count });
					return (
						<div
							key={week.start}
							role='img'
							aria-label={label}
							title={label}
							className={`min-w-0 flex-1 rounded-sm ${week.count > 0 ? "bg-primary/70" : "bg-muted"}`}
							style={{ height: `${Math.max(week.ratio * 100, 4)}%` }}
						/>
					);
				})}
			</div>
			<div className='flex justify-between text-xs text-muted-foreground'>
				<span>{t("statistics.weeksAgo", { count: activity.weeks.length })}</span>
				<span>{t("statistics.now")}</span>
			</div>
		</div>
	);
}

function TopRatedList({ items }: { items: StatisticsTopRated[] }): ReactElement {
	const { t } = useTranslation();
	const animeInfo = useAnimeInfoNav();
	if (items.length === 0) {
		return <p className='text-sm text-muted-foreground'>{t("common.none")}</p>;
	}
	return (
		<ol className='flex flex-col gap-1'>
			{items.map((item) => (
				<li key={item.id}>
					<button
						type='button'
						className='flex w-full items-center gap-3 rounded-md p-1 text-left text-sm hover:bg-muted focus-visible:bg-muted'
						onClick={() => {
							animeInfo.open({ id: item.id, infoTab: "main", title: item.title, coverUrl: item.coverUrl || undefined });
						}}>
						<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' className='aspect-2/3 w-8 shrink-0 overflow-hidden rounded-sm bg-muted' lazy />
						<span className='min-w-0 flex-1 truncate'>{item.title}</span>
						<span className='font-medium tabular-nums'>{item.score}</span>
					</button>
				</li>
			))}
		</ol>
	);
}

function ScoreColumns({ buckets }: { buckets: { score: number; count: number; ratio: number }[] }): ReactElement {
	const { t } = useTranslation();
	return (
		<div className='flex h-36 items-end gap-1.5'>
			{buckets.map((bucket) => (
				<div key={bucket.score} className='flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1'>
					<span className='text-[10px] tabular-nums text-muted-foreground'>{bucket.count > 0 ? bucket.count : ""}</span>
					<div
						role='img'
						aria-label={t("statistics.scoreBucket", { score: bucket.score, count: bucket.count })}
						className={`w-full rounded-sm ${bucket.count > 0 ? "bg-primary/70" : "bg-muted"}`}
						style={{ height: `${Math.max(bucket.ratio * 100, 3)}%` }}
					/>
					<span className='text-xs tabular-nums text-muted-foreground'>{bucket.score}</span>
				</div>
			))}
		</div>
	);
}

function StatusDonut({ items }: { items?: StatBar[] | null }): ReactElement {
	const { t } = useTranslation();
	const slices = items ?? [];
	const total = slices.reduce((sum, item) => sum + item.count, 0);
	return (
		<div className='flex flex-wrap items-center gap-6'>
			<div
				role='img'
				aria-label={slices.map((item) => t("statistics.pieSlice", { label: displayStatLabel(item.label), count: item.count })).join(", ") || t("statistics.noListStatuses")}
				className='relative grid size-32 shrink-0 place-items-center rounded-full'
				style={{ background: pieBackground(slices) }}>
				<div className='flex size-[72%] flex-col items-center justify-center rounded-full bg-card'>
					<span className='text-lg font-semibold tabular-nums'>{total}</span>
					<span className='text-[10px] text-muted-foreground'>{t("statistics.total")}</span>
				</div>
			</div>
			<ul className='flex min-w-40 flex-1 flex-col gap-1.5 text-sm'>
				{slices.map((item, index) => (
					<li key={item.label} className='flex items-center gap-2'>
						<span className={`size-2 shrink-0 rounded-full ${CHART_BG[index % CHART_BG.length]}`} />
						<span className='flex-1 truncate'>{displayStatLabel(item.label)}</span>
						<span className='tabular-nums text-muted-foreground'>
							{item.count}
							{total > 0 ? <span className='ml-1.5 text-xs'>{Math.round((item.count / total) * 100)}%</span> : null}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function StatisticsSkeleton(): ReactElement {
	return (
		<div className='flex flex-col gap-4'>
			<div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5'>
				{["t0", "t1", "t2", "t3", "t4"].map((id) => (
					<Skeleton key={id} className='h-[5.25rem] rounded-lg' />
				))}
			</div>
			<div className='grid gap-4 lg:grid-cols-2'>
				<Skeleton className='h-52 rounded-lg' />
				<Skeleton className='h-52 rounded-lg' />
			</div>
		</div>
	);
}

export function StatisticsView(): ReactElement {
	const { t } = useTranslation();
	const query = trpc.statistics.summary.useQuery();
	const data = query.data;
	const coverage = data?.libraryCoverage ?? { have: 0, aired: 0, ratio: 0, byStatus: [] };
	const [tab, setTab] = useState<StatsTab>("list");

	return (
		<div className='flex h-full min-h-0 flex-col'>
			<Tabs
				value={tab}
				onValueChange={(value) => {
					setTab(value as StatsTab);
				}}
				className='flex h-full min-h-0 flex-col gap-0'>
				<div className='flex h-10 shrink-0 items-center border-b bg-card px-4'>
					<TabsList className='h-auto gap-4 bg-transparent p-0'>
						<TabsTrigger
							value='list'
							className='h-auto flex-none border-0 px-0 py-0 text-sm font-medium text-muted-foreground shadow-none hover:text-foreground data-active:bg-transparent data-active:text-foreground data-active:shadow-none dark:data-active:bg-transparent dark:data-active:border-transparent'>
							{t("statistics.yourList")}
						</TabsTrigger>
						<TabsTrigger
							value='app'
							className='h-auto flex-none border-0 px-0 py-0 text-sm font-medium text-muted-foreground shadow-none hover:text-foreground data-active:bg-transparent data-active:text-foreground data-active:shadow-none dark:data-active:bg-transparent dark:data-active:border-transparent'>
							{t("statistics.app")}
						</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value={tab} keepMounted={false} className='m-0 min-h-0 flex-1'>
					<ScrollArea className='h-full min-h-0' viewportClassName='px-6 py-5'>
						<div className='flex w-full max-w-5xl flex-col gap-4'>
							{query.isPending && !data ? (
								<StatisticsSkeleton />
							) : data && tab === "list" ? (
								<>
									<div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5'>
										<StatTile label={t("statistics.tileAnime")} value={data.animeCount} hint={completionHint(data.statusDistribution)} />
										<StatTile label={t("statistics.tileEpisodes")} value={data.episodeCount} />
										<StatTile
											label={t("statistics.tileWatched")}
											value={formatShortDuration(data.spentMinutes)}
											hint={data.remainingMinutes > 0 ? t("statistics.remaining", { value: formatShortDuration(data.remainingMinutes) }) : undefined}
											title={formatDuration(data.spentMinutes)}
										/>
										<StatTile label={t("statistics.tileMeanScore")} value={data.meanScore.toFixed(2)} hint={t("statistics.deviation", { value: data.scoreDeviation.toFixed(2) })} />
										<StatTile
											label={t("statistics.tileThisWeek")}
											value={t("statistics.episodes", { count: data.activity.lastSevenDays.episodes })}
											hint={data.activity.lastSevenDays.minutes > 0 ? formatShortDuration(data.activity.lastSevenDays.minutes) : undefined}
										/>
									</div>
									<div className='grid gap-4 lg:grid-cols-2'>
										<Panel title={t("statistics.watchActivity")} className='lg:col-span-2'>
											<ActivityStrip activity={data.activity} />
										</Panel>
										<Panel title={t("statistics.scoreDistribution")}>
											<ScoreColumns buckets={data.scoreDistribution} />
										</Panel>
										<Panel title={t("statistics.listStatus")}>
											<StatusDonut items={data.statusDistribution} />
										</Panel>
										<Panel title={t("statistics.topRated")}>
											<TopRatedList items={data.topRated} />
										</Panel>
										<Panel title={t("statistics.format")}>
											<BarList items={data.typeDistribution} />
										</Panel>
										<Panel title={t("statistics.rewatches")}>
											<BarList items={data.rewatchDistribution} />
										</Panel>
										<Panel title={t("statistics.topGenres")}>
											<BarList items={data.genreDistribution} />
										</Panel>
										<Panel title={t("statistics.libraryCoverage")}>
											<div className='flex items-baseline justify-between gap-4'>
												<span className='text-2xl font-semibold tabular-nums tracking-tight'>{Math.round(coverage.ratio * 100)}%</span>
												<span className='text-xs text-muted-foreground tabular-nums'>{t("statistics.ofAired", { have: coverage.have, aired: coverage.aired })}</span>
											</div>
											<div className='h-1.5 overflow-hidden rounded-full bg-muted'>
												<div className='h-full rounded-full bg-primary/70' style={{ width: `${coverage.ratio * 100}%` }} />
											</div>
											<BarList items={coverage.byStatus} value={(item) => `${item.count}/${item.total ?? 0}`} />
										</Panel>
									</div>
								</>
							) : data && tab === "app" ? (
								<div className='grid gap-4 lg:grid-cols-2'>
									<Panel title={t("statistics.localDatabase")}>
										<dl className='divide-y'>
											<DetailRow label={t("statistics.animeCount")} value={t("statistics.fileSize", { count: data.localAnimeCount, size: formatBytes(data.databaseSizeBytes) })} />
											<DetailRow
												label={t("statistics.episodeFiles")}
												value={t("statistics.fileSize", { count: data.episodeFileCount, size: formatBytes(data.episodeFileSizeBytes) })}
											/>
											<DetailRow label={t("statistics.imageFiles")} value={t("statistics.fileSize", { count: data.imageCount, size: formatBytes(data.imageSizeBytes) })} />
											<DetailRow label={t("statistics.torrentFiles")} value={t("statistics.fileSize", { count: data.torrentCount, size: formatBytes(data.torrentSizeBytes) })} />
										</dl>
									</Panel>
									<Panel title={t("statistics.biyori")}>
										<dl className='divide-y'>
											<DetailRow
												label={t("statistics.connections")}
												value={
													data.connectionsFailed > 0 ? t("statistics.connectionsFailed", { count: data.connectionCount, failed: data.connectionsFailed }) : data.connectionCount
												}
											/>
											<DetailRow label={t("statistics.uptime")} value={formatUptime(data.uptimeSeconds)} />
										</dl>
									</Panel>
								</div>
							) : null}
						</div>
					</ScrollArea>
				</TabsContent>
			</Tabs>
		</div>
	);
}
