import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/mainview/components/ui/separator";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { trpc } from "@/mainview/trpc";
import type { ReactElement } from "react";

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
				<>
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
				</>
			) : null}
		</ScrollArea>
	);
}
