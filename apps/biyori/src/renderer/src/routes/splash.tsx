import Logo from "@/mainview/components/logo";
import { splashSegmentState } from "@/mainview/lib/splash-progress";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/splash")({
	component: SplashPage,
});

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
	const { completed, total, inner } = splashSegmentState({
		bootBody: boot?.body,
		scanTitle: scan?.title,
		scanBody: scan?.body,
	});
	const label = [boot?.title ?? "Starting", scan?.body].filter(Boolean).join(" · ");

	return (
		<div className='app-region-drag pointer-events-drag flex min-h-0 flex-1 select-none flex-col items-center justify-center gap-5 bg-background px-8'>
			<Logo className='size-14' />
			<SegmentedProgress completed={completed} total={total} inner={inner} />
			<p className='text-center text-xs text-muted-foreground'>{label}</p>
		</div>
	);
}
