import { t } from "@biyori/translations/react";
import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { desktopRpc } from "@/desktop-rpc";
import Logo from "@/mainview/components/app/shell/logo";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Button } from "@/mainview/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/mainview/components/ui/progress";
import { usePreventNavigation } from "@/mainview/lib/prevent-navigation";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { formatTransferRate } from "@/shared/updater";

export const Route = createFileRoute("/update")({
	staticData: { chrome: "child" },
	component: UpdatePage,
});

type UpdateState = inferRouterOutputs<AppRouter>["updater"]["status"];
type PrimaryKind = "check" | "restart" | null;

function statusCopy(status: UpdateState): { title: string; detail: string } {
	switch (status.phase) {
		case "checking":
			return { title: t("update.checkingTitle"), detail: status.message || t("update.lookingForNewer") };
		case "available":
			return {
				title: t("update.downloadingTitle"),
				detail: status.remoteVersion ? t("update.gettingVersion", { version: status.remoteVersion }) : status.message || t("update.gettingBuild"),
			};
		case "downloading":
			return { title: t("update.downloadingTitle"), detail: status.message || t("update.keepWindowOpen") };
		case "ready":
			return {
				title: t("update.restartTitle"),
				detail: status.remoteVersion ? t("update.restartToApplyVersion", { version: status.remoteVersion }) : status.message || t("update.restartToApply"),
			};
		case "up-to-date":
			return { title: t("update.upToDateTitle"), detail: status.message || t("update.noNewerBuild") };
		case "error":
			return { title: t("update.couldNotUpdate"), detail: t("update.checkConnection") };
		case "dev":
			return { title: t("update.updatesOff"), detail: status.message || t("update.noInstall") };
		default:
			return { title: t("update.updates"), detail: status.message || t("update.checkWhenYouWant") };
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
	const versionLabel = [status.localVersion || t("update.versionUnknown"), status.localChannel].filter(Boolean).join(" ");

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
						<AlertTitle>{t("update.updateFailed")}</AlertTitle>
						<AlertDescription>{status.error}</AlertDescription>
					</Alert>
				) : null}
				{percent != null ? (
					<Progress value={percent} className='w-full max-w-sm'>
						<ProgressLabel className='sr-only'>{t("update.download")}</ProgressLabel>
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
					{t("common.close")}
				</Button>
				{action === "check" ? (
					<Button
						type='button'
						loading={primaryBusy}
						onClick={() => {
							void check.mutateAsync();
						}}>
						<RefreshCwIcon data-icon='inline-start' />
						{t("update.checkAgain")}
					</Button>
				) : null}
				{action === "restart" ? (
					<Button
						type='button'
						loading={primaryBusy}
						onClick={() => {
							void apply.mutateAsync();
						}}>
						{t("update.restartToUpdate")}
					</Button>
				) : null}
			</div>
		</div>
	);
}
