import { useTranslation } from "@biyori/translations/react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import Logo from "@/mainview/components/app/shell/logo";
import { Spinner } from "@/mainview/components/ui/spinner";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";

export const Route = createFileRoute("/splash")({
	component: SplashPage,
});

const STEP_ICON = {
	active: <Spinner size='xs' color='foreground' aria-hidden />,
	done: <CheckIcon className='size-3 text-primary' />,
	error: <CircleAlertIcon className='size-3 text-destructive' />,
} as const;

function SplashPage() {
	const { t } = useTranslation();
	const utils = trpc.useUtils();
	const steps = trpc.startup.snapshot.useQuery().data ?? [];
	trpc.startup.onChange.useSubscription(undefined, {
		onData: (next) => {
			utils.startup.snapshot.setData(undefined, next);
		},
	});
	// the window step is last; until it exists the bar can only reach half
	const total = Math.max(2, steps.length);
	const progress = steps.reduce((sum, step) => sum + (step.state === "active" ? (step.progress ?? 0) : 1), 0) / total;

	return (
		<div className='app-region-drag pointer-events-drag flex min-h-0 flex-1 select-none flex-col items-center justify-center gap-5 bg-background px-8'>
			<Logo className='size-14' />
			<div
				className='h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted'
				role='progressbar'
				aria-label={t("shell.startup")}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(progress * 100)}>
				<div data-slot='progress-indicator' className='h-full bg-primary transition-[width]' style={{ width: `${progress * 100}%` }} />
			</div>
			<ul className='grid w-full max-w-xs grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-xs' aria-live='polite'>
				{steps.length === 0 && <li className='col-span-3 text-center text-muted-foreground'>{t("shell.starting")}</li>}
				{steps.map((step) => (
					<li
						key={step.id}
						className={cn("col-span-3 grid grid-cols-subgrid items-center", step.state === "error" ? "text-destructive" : step.state === "done" && "text-muted-foreground")}>
						{STEP_ICON[step.state]}
						<span className='truncate' title={step.label}>
							{step.label}
						</span>
						<span className='max-w-36 truncate text-right text-muted-foreground tabular-nums' title={step.detail}>
							{step.detail}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
