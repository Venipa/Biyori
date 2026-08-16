import { Separator } from "@/mainview/components/ui/separator";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { trpc } from "@/mainview/trpc";

function StatRow({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="flex items-baseline gap-6 py-1 text-sm">
			<span className="w-48 shrink-0 text-muted-foreground">{label}</span>
			<span className="font-medium tabular-nums">{value}</span>
		</div>
	);
}

export function StatisticsView() {
	const query = trpc.statistics.summary.useQuery();

	if (query.isLoading) {
		return (
			<div className="flex flex-col gap-2 px-6 py-5">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-72" />
				<Skeleton className="h-4 w-64" />
			</div>
		);
	}

	const data = query.data;
	if (!data) {
		return null;
	}

	return (
		<div className="h-full overflow-auto px-6 py-5">
			<h1 className="mb-3 text-base font-semibold">Anime list</h1>
			<Separator className="mb-2" />
			<StatRow label="Anime count:" value={data.animeCount} />
			<StatRow label="Episode count:" value={data.episodeCount} />
			<StatRow label="Time spent watching:" value={data.timeSpentWatching} />
			<StatRow label="Mean score:" value={data.meanScore} />

			<h2 className="pt-4 text-sm font-semibold">Local database</h2>
			<Separator className="mt-1 mb-2" />
			<StatRow label="Anime count:" value={data.localAnimeCount} />
		</div>
	);
}
