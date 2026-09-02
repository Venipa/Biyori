import Logo from "@/mainview/components/logo";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/splash")({
	component: SplashPage,
});

function parseRatio(body: string): { current: number; total: number } | null {
	const matched = /^(\d+)\/(\d+)/.exec(body);
	if (!matched) {
		return null;
	}
	const total = Number(matched[2]);
	if (total <= 0) {
		return null;
	}
	return { current: Number(matched[1]), total };
}

function SegmentedProgress({
	completed,
	total,
	inner,
}: {
	completed: number;
	total: number;
	inner: number | null;
}) {
	const segments = Math.max(1, total);
	return (
		<div className='flex w-56 gap-1' role='progressbar' aria-label='Startup' aria-valuemin={0} aria-valuemax={100}>
			{Array.from({ length: segments }, (_, index) => {
				const finished = completed >= segments || index < completed;
				const active = !finished && index === completed;
				const pulse = active && inner == null;
				const fill = finished ? 100 : active ? (inner ?? (pulse ? 100 : 0)) : 0;
				return (
					<div key={index} className='relative h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted'>
						<div
							data-slot='progress-indicator'
							className={cn("h-full bg-primary transition-[width]", pulse && "animate-pulse")}
							style={{ width: `${fill}%` }}
						/>
					</div>
				);
			})}
		</div>
	);
}

function SplashPage() {
	const utils = trpc.useUtils();
	const activityQuery = trpc.activity.snapshot.useQuery();
	trpc.activity.onChange.useSubscription(undefined, {
		onData: (snapshot) => {
			utils.activity.snapshot.setData(undefined, snapshot);
		},
	});
	const live = activityQuery.data?.live ?? [];
	const boot = live.find((item) => item.source === "startup");
	const scan = live.find((item) => item.source === "library-scan");
	const bootRatio = boot?.body ? parseRatio(boot.body) : null;
	const innerRatio = scan?.body ? parseRatio(scan.body) : null;
	const inner = innerRatio ? Math.min(100, Math.round((innerRatio.current / innerRatio.total) * 100)) : null;
	const label = [boot?.title ?? "Starting", scan?.body].filter(Boolean).join(" · ");

	return (
		<div className='app-region-drag pointer-events-drag flex min-h-0 flex-1 select-none flex-col items-center justify-center gap-5 bg-background px-8'>
			<Logo className='size-14' />
			<SegmentedProgress completed={bootRatio?.current ?? 0} total={bootRatio?.total ?? 1} inner={inner} />
			<p className='text-center text-xs text-muted-foreground'>{label}</p>
		</div>
	);
}
