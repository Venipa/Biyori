import { createFileRoute } from "@tanstack/react-router";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { desktopRpc } from "@/desktop-rpc";
import Logo from "@/mainview/components/logo";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Button } from "@/mainview/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/mainview/components/ui/progress";
import { Spinner } from "@/mainview/components/ui/spinner";
import { usePreventNavigation } from "@/mainview/lib/prevent-navigation";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { formatTransferRate } from "@/shared/updater";
import type { inferRouterOutputs } from "@trpc/server";

export const Route = createFileRoute("/update")({
	component: UpdatePage,
});

type UpdateState = inferRouterOutputs<AppRouter>["updater"]["status"];
type PrimaryKind = "check" | "restart" | null;

function statusCopy(status: UpdateState): { title: string; detail: string } {
	switch (status.phase) {
		case "checking":
			return { title: "Checking for updates", detail: status.message || "Looking for a newer build." };
		case "available":
			return {
				title: "Downloading update",
				detail: status.remoteVersion ? `Getting Biyori ${status.remoteVersion}.` : status.message || "Getting the new build.",
			};
		case "downloading":
			return { title: "Downloading update", detail: status.message || "Keep this window open until the download finishes." };
		case "ready":
			return {
				title: "Restart to finish",
				detail: status.remoteVersion ? `Restart Biyori to apply ${status.remoteVersion}.` : status.message || "Restart to apply the update.",
			};
		case "up-to-date":
			return { title: "You're up to date", detail: status.message || "No newer build on this channel." };
		case "error":
			return { title: "Could not update", detail: "Check your connection and try again." };
		case "dev":
			return { title: "Updates are off", detail: status.message || "This build does not install updates." };
		default:
			return { title: "Updates", detail: status.message || "Check for a newer build when you want." };
	}
}

function primaryKind(status: UpdateState): PrimaryKind {
	switch (status.phase) {
		case "ready":
			return "restart";
		case "available":
		case "downloading":
		case "dev":
			return null;
		default:
			return "check";
	}
}

function UpdatePage() {
	usePreventNavigation(true);
	const status = useUpdateStatus();
	const check = trpc.updater.check.useMutation();
	const apply = trpc.updater.restartAndApply.useMutation();
	const copy = statusCopy(status);
	const action = primaryKind(status);
	const progress = status.phase === "downloading" ? status.progress : null;
	const percent = progress && Number.isFinite(progress.percent) ? Math.max(0, Math.min(100, progress.percent)) : null;
	const speed = progress && Number.isFinite(progress.bytesPerSecond) ? formatTransferRate(progress.bytesPerSecond) : null;
	const checkBusy = check.isPending || status.phase === "checking";
	const applyBusy = apply.isPending;
	const primaryBusy = action === "check" ? checkBusy : applyBusy;
	const versionLabel = [status.localVersion || "...", status.localChannel].filter(Boolean).join(" ");

	return (
		<div className='flex min-h-0 flex-1 flex-col bg-background text-foreground'>
			<div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-8 py-6'>
				<Logo className='size-14' />
				<div className='flex w-full max-w-sm flex-col items-center gap-1 text-center'>
					<h1 className='text-sm font-medium'>{copy.title}</h1>
					<p className='text-xs text-muted-foreground'>{copy.detail}</p>
				</div>
				{status.phase === "error" && status.error ? (
					<Alert variant='destructive' className='w-full max-w-sm'>
						<CircleAlertIcon />
						<AlertTitle>Update failed</AlertTitle>
						<AlertDescription>{status.error}</AlertDescription>
					</Alert>
				) : null}
				{percent != null ? (
					<Progress value={percent} className='w-full max-w-sm'>
						<ProgressLabel className='sr-only'>Download</ProgressLabel>
						<ProgressValue>{() => `${Math.round(percent)}%${speed ? ` · ${speed}` : ""}`}</ProgressValue>
					</Progress>
				) : null}
			</div>
			<div className='flex shrink-0 items-center gap-2 border-t bg-muted/50 px-4 py-3'>
				<p className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>{versionLabel}</p>
				<Button
					type='button'
					variant='outline'
					onClick={() => {
						void desktopRpc.request.closeUpdate({});
					}}>
					Close
				</Button>
				{action === "check" ? (
					<Button
						type='button'
						disabled={primaryBusy}
						onClick={() => {
							void check.mutateAsync();
						}}>
						{primaryBusy ? <Spinner data-icon='inline-start' /> : <RefreshCwIcon data-icon='inline-start' />}
						Check again
					</Button>
				) : null}
				{action === "restart" ? (
					<Button
						type='button'
						disabled={primaryBusy}
						onClick={() => {
							void apply.mutateAsync();
						}}>
						{primaryBusy ? <Spinner data-icon='inline-start' /> : null}
						Restart to update
					</Button>
				) : null}
			</div>
		</div>
	);
}
