import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/mainview/components/ui/separator";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
import { trpc } from "@/mainview/trpc";
import type { ReactElement } from "react";

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
		return "None";
	}
	const days = Math.floor(minutes / 1440);
	const hours = Math.floor((minutes % 1440) / 60);
	const remainingMinutes = Math.floor(minutes % 60);
	return `${days} days ${hours} hours ${remainingMinutes} minutes`;
}

function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;
	return `${days} days ${hours} hours ${minutes} minutes ${remainingSeconds} seconds`;
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

function BarList({ items, value }: { items: StatBar[]; value?: (item: StatBar) => string }): ReactElement {
	if (items.length === 0) {
		return <p className='text-sm text-muted-foreground'>None</p>;
	}
	return (
		<div className='flex max-w-xl flex-col gap-1'>
			{items.map((item, index) => (
				<div key={item.label} className='grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2 text-sm'>
					<span className='truncate text-right' title={item.label}>
						{item.label}
					</span>
					<div className='h-4 overflow-hidden rounded-sm bg-muted'>
						<div
							role='img'
							aria-label={`${item.label}: ${value?.(item) ?? item.count}`}
							className={`h-full ${CHART_BG[index % CHART_BG.length]}`}
							style={{ width: `${item.ratio * 100}%` }}
						/>
					</div>
					<span className='tabular-nums text-muted-foreground'>{value?.(item) ?? item.count}</span>
				</div>
			))}
		</div>
	);
}

function StatusPie({ items }: { items: StatBar[] }): ReactElement {
	const total = items.reduce((sum, item) => sum + item.count, 0);
	return (
		<div className='flex flex-wrap items-center gap-8'>
			<div
				role='img'
				aria-label={items.map((item) => `${item.label} ${item.count}`).join(", ") || "No list statuses"}
				className='size-40 shrink-0 rounded-full'
				style={{ background: pieBackground(items) }}
			/>
			<ul className='flex min-w-48 flex-col gap-1.5 text-sm'>
				{items.map((item, index) => (
					<li key={item.label} className='flex items-center gap-2'>
						<span className={`size-2.5 shrink-0 rounded-sm ${CHART_BG[index % CHART_BG.length]}`} />
						<span className='flex-1'>{item.label}</span>
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

export function StatisticsView(): ReactElement {
	const query = trpc.statistics.summary.useQuery();
	const data = query.data;

	return (
		<ScrollArea viewportClassName='flex min-h-0 flex-col gap-5 px-6 py-5'>
			{query.isPending && !data ? (
				<div>
					<Skeleton className='mb-2 h-5 w-64' />
					<Skeleton className='mb-2 h-5 w-56' />
					<Skeleton className='mb-2 h-5 w-72' />
					<Skeleton className='h-5 w-40' />
				</div>
			) : data ? (
				<Tabs defaultValue='overview' className='gap-4'>
					<TabsList variant='line' className='shrink-0'>
						<TabsTrigger value='overview'>Overview</TabsTrigger>
						<TabsTrigger value='mix'>Mix</TabsTrigger>
						<TabsTrigger value='genres'>Genres</TabsTrigger>
						<TabsTrigger value='library'>Library</TabsTrigger>
					</TabsList>
					<TabsContent value='overview' keepMounted={false} className='mt-0 flex flex-col gap-5'>
						<section>
							<h1 className='text-base font-semibold'>Anime list</h1>
							<Separator className='my-2' />
							<StatRow label='Anime count:' value={data.animeCount} />
							<StatRow label='Episode count:' value={data.episodeCount} />
							<StatRow label='Time spent watching:' value={formatDuration(data.spentMinutes)} />
							<StatRow label='Time remaining:' value={formatDuration(data.remainingMinutes)} />
							<StatRow label='Mean score:' value={data.meanScore.toFixed(2)} />
							<StatRow label='Score deviation:' value={data.scoreDeviation.toFixed(2)} />
						</section>
						<section>
							<h2 className='text-sm font-semibold'>Score distribution</h2>
							<Separator className='my-2' />
							<div className='flex max-w-xl flex-col gap-1'>
								{data.scoreDistribution.map((bucket) => (
									<div key={bucket.score} className='grid grid-cols-[2rem_1fr_3rem] items-center gap-2 text-sm'>
										<span className='text-right tabular-nums'>{bucket.score}</span>
										<div className='h-4 overflow-hidden rounded-sm bg-muted'>
											<div role='img' aria-label={`Score ${bucket.score}: ${bucket.count}`} className='h-full bg-primary' style={{ width: `${bucket.ratio * 100}%` }} />
										</div>
										<span className='tabular-nums text-muted-foreground'>{bucket.count}</span>
									</div>
								))}
							</div>
						</section>
						<section>
							<h2 className='text-sm font-semibold'>Local database</h2>
							<Separator className='my-2' />
							<StatRow label='Anime count:' value={data.localAnimeCount} />
							<StatRow label='Image files:' value={`${data.imageCount} (${formatBytes(data.imageSizeBytes)})`} />
							<StatRow label='Torrent files:' value={`${data.torrentCount} (${formatBytes(data.torrentSizeBytes)})`} />
						</section>
						<section>
							<h2 className='text-sm font-semibold'>Biyori</h2>
							<Separator className='my-2' />
							<StatRow label='Connections:' value={`${data.connectionCount}${data.connectionsFailed > 0 ? ` (${data.connectionsFailed} failed)` : ""}`} />
							<StatRow label='Uptime:' value={formatUptime(data.uptimeSeconds)} />
						</section>
					</TabsContent>
					<TabsContent value='mix' keepMounted={false} className='mt-0 flex flex-col gap-5'>
						<section>
							<h2 className='text-sm font-semibold'>List status</h2>
							<Separator className='my-2' />
							<StatusPie items={data.statusDistribution} />
						</section>
						<section>
							<h2 className='text-sm font-semibold'>Format</h2>
							<Separator className='my-2' />
							<BarList items={data.typeDistribution} />
						</section>
					</TabsContent>
					<TabsContent value='genres' keepMounted={false} className='mt-0 flex flex-col gap-5'>
						<section>
							<h2 className='text-sm font-semibold'>Top genres</h2>
							<Separator className='my-2' />
							<BarList items={data.genreDistribution} />
						</section>
					</TabsContent>
					<TabsContent value='library' keepMounted={false} className='mt-0 flex flex-col gap-5'>
						<section>
							<h2 className='text-sm font-semibold'>Library coverage</h2>
							<Separator className='my-2' />
							<StatRow label='Episode files:' value={data.libraryCoverage.have} />
							<StatRow label='Aired episodes:' value={data.libraryCoverage.aired} />
							<StatRow label='Coverage:' value={`${Math.round(data.libraryCoverage.ratio * 100)}%`} />
							<div className='mt-3'>
								<BarList
									items={data.libraryCoverage.byStatus}
									value={(item) => `${item.count}/${item.total ?? 0}`}
								/>
							</div>
						</section>
						<section>
							<h2 className='text-sm font-semibold'>Rewatches</h2>
							<Separator className='my-2' />
							<BarList items={data.rewatchDistribution} />
						</section>
					</TabsContent>
				</Tabs>
			) : null}
		</ScrollArea>
	);
}
