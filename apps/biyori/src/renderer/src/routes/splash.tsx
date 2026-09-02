import { createFileRoute } from "@tanstack/react-router";
import Logo from "@/mainview/components/logo";
import { Progress, ProgressLabel } from "@/mainview/components/ui/progress";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";

export const Route = createFileRoute("/splash")({
	component: SplashPage,
});

function matchPercent(body: string): number | null {
	const matched = /^(\d+)\/(\d+)/.exec(body);
	if (!matched) {
		return null;
	}
	const total = Number(matched[2]);
	if (total <= 0) {
		return null;
	}
	return Math.round((Number(matched[1]) / total) * 100);
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
	const percent = boot ? matchPercent(boot.body) : null;
	const label = [boot?.title ?? "Starting", scan?.body].filter(Boolean).join(" · ");

	return (
		<div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-5 bg-background px-8'>
			<Logo className='size-14' />
			<Progress value={percent ?? 0} className={cn("w-56 flex-col gap-2", percent == null && "progress-indeterminate")}>
				<ProgressLabel className='sr-only'>Startup</ProgressLabel>
			</Progress>
			<p className='text-center text-xs text-muted-foreground'>{label}</p>
		</div>
	);
}
