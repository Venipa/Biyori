import { t, useTranslation } from "@biyori/translations/react";
import { type ReactElement, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listStatusLabel } from "@/mainview/components/app/anime/list-action";
import { Separator } from "@/mainview/components/ui/separator";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
import { airingStatusLabel } from "@/mainview/lib/anime-airing-notice";
import { animeTypeLabel, genreLabel } from "@/mainview/lib/anime-list-filter";
import { trpc } from "@/mainview/trpc";

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

const tabTriggerClass =
	"rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-3 py-2 text-sm data-active:border-primary data-active:bg-transparent data-active:shadow-none";

type StatsTab = "overview" | "mix" | "genres" | "library";

const CHART_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"] as const;
const CHART_BG = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"] as const;

type StatBar = {
	label: string;
	count: number;
	ratio: number;
	total?: number;
};

function StatRow({ label, value }: { label: string; value: string | number }): ReactElement {
	return (
		<div className='flex items-baseline gap-6 py-1 text-sm'>
			<span className='w-48 shrink-0 text-muted-foreground'>{label}</span>
			<span className='font-medium tabular-nums'>{value}</span>
		</div>
	);
}

function formatDuration(minutes: number): string {
	if (minutes <= 0) {
		return t("common.none");
	}
	const days = Math.floor(minutes / 1440);
	const hours = Math.floor((minutes % 1440) / 60);
	const remainingMinutes = Math.floor(minutes % 60);
	return t("statistics.duration", { days, hours, minutes: remainingMinutes });
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

function BarList({ items, value }: { items?: StatBar[] | null; value?: (item: StatBar) => string }): ReactElement {
	const { t } = useTranslation();
	if (!items || items.length === 0) {
		return <p className='text-sm text-muted-foreground'>{t("common.none")}</p>;
	}
	return (
		<div className='flex max-w-xl flex-col gap-1'>
			{items.map((item, index) => {
				const label = displayStatLabel(item.label);
				const shown = value?.(item) ?? String(item.count);
				return (
					<div key={item.label} className='grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2 text-sm'>
						<span className='truncate text-right' title={label}>
							{label}
						</span>
						<div className='h-4 overflow-hidden rounded-sm bg-muted'>
							<div
								role='img'
								aria-label={t("statistics.barValue", { label, value: shown })}
								className={`h-full ${CHART_BG[index % CHART_BG.length]}`}
								style={{ width: `${item.ratio * 100}%` }}
							/>
						</div>
						<span className='tabular-nums text-muted-foreground'>{shown}</span>
					</div>
				);
			})}
		</div>
	);
}

function StatusPie({ items }: { items?: StatBar[] | null }): ReactElement {
	const { t } = useTranslation();
	const slices = items ?? [];
	const total = slices.reduce((sum, item) => sum + item.count, 0);
	return (
		<div className='flex flex-wrap items-center gap-8'>
			<div
				role='img'
				aria-label={slices.map((item) => t("statistics.pieSlice", { label: displayStatLabel(item.label), count: item.count })).join(", ") || t("statistics.noListStatuses")}
				className='size-40 shrink-0 rounded-full'
				style={{ background: pieBackground(slices) }}
			/>
			<ul className='flex min-w-48 flex-col gap-1.5 text-sm'>
				{slices.map((item, index) => (
					<li key={item.label} className='flex items-center gap-2'>
						<span className={`size-2.5 shrink-0 rounded-sm ${CHART_BG[index % CHART_BG.length]}`} />
						<span className='flex-1'>{displayStatLabel(item.label)}</span>
						<span className='tabular-nums text-muted-foreground'>
							{item.count}
							{total > 0 ? ` (${Math.round((item.count / total) * 100)}%)` : ""}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function StatisticsSkeleton(): ReactElement {
	return (
		<div className='flex flex-col gap-5'>
			<section>
				<Skeleton className='h-5 w-28' />
				<Separator className='my-2' />
				{["r0", "r1", "r2", "r3", "r4", "r5"].map((id) => (
					<div key={id} className='flex items-baseline gap-6 py-1'>
						<Skeleton className='h-4 w-48 shrink-0' />
						<Skeleton className='h-4 w-24' />
					</div>
				))}
			</section>
			<section>
				<Skeleton className='h-4 w-40' />
				<Separator className='my-2' />
				<div className='flex max-w-xl flex-col gap-1'>
					{["b0", "b1", "b2", "b3"].map((id) => (
						<div key={id} className='grid grid-cols-[2rem_1fr_3rem] items-center gap-2'>
							<Skeleton className='h-4 w-6 justify-self-end' />
							<Skeleton className='h-4 w-full rounded-sm' />
							<Skeleton className='h-4 w-8' />
						</div>
					))}
				</div>
			</section>
		</div>
	);
}

export function StatisticsView(): ReactElement {
	const { t } = useTranslation();
	const query = trpc.statistics.summary.useQuery();
	const data = query.data;
	const coverage = data?.libraryCoverage ?? { have: 0, aired: 0, ratio: 0, byStatus: [] };
	const [tab, setTab] = useState<StatsTab>("overview");

	return (
		<div className='flex h-full min-h-0 flex-col'>
			<Tabs
				value={tab}
				onValueChange={(value) => {
					setTab(value as StatsTab);
				}}
				className='flex h-full min-h-0 flex-col gap-0'>
				<div className='shrink-0 border-b bg-card px-2 pt-2'>
					<TabsList className='h-auto bg-transparent p-0'>
						<TabsTrigger value='overview' className={tabTriggerClass}>
							{t("statistics.overview")}
						</TabsTrigger>
						<TabsTrigger value='mix' className={tabTriggerClass}>
							{t("statistics.mix")}
						</TabsTrigger>
						<TabsTrigger value='genres' className={tabTriggerClass}>
							{t("statistics.genres")}
						</TabsTrigger>
						<TabsTrigger value='library' className={tabTriggerClass}>
							{t("statistics.library")}
						</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value={tab} keepMounted={false} className='m-0 min-h-0 flex-1'>
					<ScrollArea className='h-full min-h-0' viewportClassName='flex min-h-0 flex-col gap-5 px-6 py-5'>
						{query.isPending && !data ? (
							<StatisticsSkeleton />
						) : data && tab === "overview" ? (
							<>
								<section>
									<h1 className='text-base font-semibold'>{t("statistics.animeList")}</h1>
									<Separator className='my-2' />
									<StatRow label={t("statistics.animeCount")} value={data.animeCount} />
									<StatRow label={t("statistics.episodeCount")} value={data.episodeCount} />
									<StatRow label={t("statistics.timeSpent")} value={formatDuration(data.spentMinutes)} />
									<StatRow label={t("statistics.timeRemaining")} value={formatDuration(data.remainingMinutes)} />
									<StatRow label={t("statistics.meanScore")} value={data.meanScore.toFixed(2)} />
									<StatRow label={t("statistics.scoreDeviation")} value={data.scoreDeviation.toFixed(2)} />
								</section>
								<section>
									<h2 className='text-sm font-semibold'>{t("statistics.scoreDistribution")}</h2>
									<Separator className='my-2' />
									<div className='flex max-w-xl flex-col gap-1'>
										{data.scoreDistribution.map((bucket) => (
											<div key={bucket.score} className='grid grid-cols-[2rem_1fr_3rem] items-center gap-2 text-sm'>
												<span className='text-right tabular-nums'>{bucket.score}</span>
												<div className='h-4 overflow-hidden rounded-sm bg-muted'>
													<div
														role='img'
														aria-label={t("statistics.scoreBucket", { score: bucket.score, count: bucket.count })}
														className='h-full bg-primary'
														style={{ width: `${bucket.ratio * 100}%` }}
													/>
												</div>
												<span className='tabular-nums text-muted-foreground'>{bucket.count}</span>
											</div>
										))}
									</div>
								</section>
								<section>
									<h2 className='text-sm font-semibold'>{t("statistics.localDatabase")}</h2>
									<Separator className='my-2' />
									<StatRow label={t("statistics.animeCount")} value={data.localAnimeCount} />
									<StatRow label={t("statistics.imageFiles")} value={t("statistics.fileSize", { count: data.imageCount, size: formatBytes(data.imageSizeBytes) })} />
									<StatRow label={t("statistics.torrentFiles")} value={t("statistics.fileSize", { count: data.torrentCount, size: formatBytes(data.torrentSizeBytes) })} />
								</section>
								<section>
									<h2 className='text-sm font-semibold'>{t("statistics.biyori")}</h2>
									<Separator className='my-2' />
									<StatRow
										label={t("statistics.connections")}
										value={data.connectionsFailed > 0 ? t("statistics.connectionsFailed", { count: data.connectionCount, failed: data.connectionsFailed }) : data.connectionCount}
									/>
									<StatRow label={t("statistics.uptime")} value={formatUptime(data.uptimeSeconds)} />
								</section>
							</>
						) : data && tab === "mix" ? (
							<>
								<section>
									<h2 className='text-sm font-semibold'>{t("statistics.listStatus")}</h2>
									<Separator className='my-2' />
									<StatusPie items={data.statusDistribution} />
								</section>
								<section>
									<h2 className='text-sm font-semibold'>{t("statistics.format")}</h2>
									<Separator className='my-2' />
									<BarList items={data.typeDistribution} />
								</section>
							</>
						) : data && tab === "genres" ? (
							<section>
								<h2 className='text-sm font-semibold'>{t("statistics.topGenres")}</h2>
								<Separator className='my-2' />
								<BarList items={data.genreDistribution} />
							</section>
						) : data && tab === "library" ? (
							<>
								<section>
									<h2 className='text-sm font-semibold'>{t("statistics.libraryCoverage")}</h2>
									<Separator className='my-2' />
									<StatRow label={t("statistics.episodeFiles")} value={coverage.have} />
									<StatRow label={t("statistics.airedEpisodes")} value={coverage.aired} />
									<StatRow label={t("statistics.coverage")} value={`${Math.round(coverage.ratio * 100)}%`} />
									<div className='mt-3'>
										<BarList items={coverage.byStatus} value={(item) => `${item.count}/${item.total ?? 0}`} />
									</div>
								</section>
								<section>
									<h2 className='text-sm font-semibold'>{t("statistics.rewatches")}</h2>
									<Separator className='my-2' />
									<BarList items={data.rewatchDistribution} />
								</section>
							</>
						) : null}
					</ScrollArea>
				</TabsContent>
			</Tabs>
		</div>
	);
}
