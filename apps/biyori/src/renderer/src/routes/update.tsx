import { t } from "@biyori/translations/react";
import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowRightIcon, CircleAlertIcon, DownloadIcon, RefreshCwIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { desktopRpc } from "@/desktop-rpc";
import { MarkdownBody } from "@/mainview/components/app/shared/markdown-body";
import Logo from "@/mainview/components/app/shell/logo";
import { UpdateChannelToggle } from "@/mainview/components/app/update/channel-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/mainview/components/ui/progress";
import { usePreventNavigation } from "@/mainview/lib/prevent-navigation";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { formatTransferRate, getVersionChannel, parseUpdateChannel, type UpdateChannel } from "@/shared/updater";

export const Route = createFileRoute("/update")({
	staticData: { chrome: "child" },
	component: UpdatePage,
});

type UpdateState = inferRouterOutputs<AppRouter>["updater"]["status"];

function statusCopy(status: UpdateState): { title: string; detail: string } {
	switch (status.phase) {
		case "checking":
			return { title: t("update.checkingTitle"), detail: status.message || t("update.lookingForNewer") };
		case "available":
			return {
				title: t("update.availableTitle"),
				detail: status.remoteVersion ? t("update.readyToDownload", { version: status.remoteVersion }) : status.message || t("update.gettingBuild"),
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

const channelLabel = { stable: "update.stable", beta: "update.beta", alpha: "update.alpha" } as const;

function closeWindow() {
	void desktopRpc.request.closeUpdate({});
}

function UpdatePage() {
	usePreventNavigation(true);
	const status = useUpdateStatus();
	const utils = trpc.useUtils();
	const check = trpc.updater.check.useMutation();
	const download = trpc.updater.download.useMutation();
	const apply = trpc.updater.restartAndApply.useMutation();
	const settings = trpc.settings.get.useQuery();
	const saveSettings = trpc.settings.set.useMutation();
	const changelog = trpc.updater.changelog.useQuery();
	const channel = parseUpdateChannel(settings.data?.updateChannel ?? status.localChannel);
	const copy = statusCopy(status);
	const progress = status.phase === "downloading" ? status.progress : null;
	const percent = progress && Number.isFinite(progress.percent) ? Math.max(0, Math.min(100, progress.percent)) : null;
	const speed = progress && Number.isFinite(progress.bytesPerSecond) ? formatTransferRate(progress.bytesPerSecond) : null;
	const hasUpdate = status.phase === "available" || status.phase === "downloading" || status.phase === "ready";
	const remoteKind = status.remoteVersion ? getVersionChannel(status.remoteVersion) : null;
	const notes = hasUpdate && changelog.data?.ok ? changelog.data.items.find((item) => item.version === status.remoteVersion) : undefined;

	async function selectChannel(next: UpdateChannel) {
		await saveSettings.mutateAsync({ updateChannel: next });
		// main re-checks on channel change via its settings subscription
		await Promise.all([utils.settings.get.invalidate(), utils.updater.changelog.invalidate()]);
	}

	return (
		<div className='flex min-h-0 flex-1 flex-col bg-background text-foreground'>
			<header className='flex shrink-0 flex-col gap-4 border-b px-5 py-5'>
				<div className='flex items-center gap-3'>
					<Logo className='size-10 shrink-0' />
					<div className='flex min-w-0 flex-col gap-0.5'>
						<h1 className='text-sm font-medium'>{copy.title}</h1>
						<p className='truncate text-xs text-muted-foreground'>{copy.detail}</p>
					</div>
				</div>
				<div className='flex items-center gap-2 text-xs tabular-nums'>
					<span className='text-muted-foreground'>{status.localVersion || t("update.versionUnknown")}</span>
					{hasUpdate && status.remoteVersion ? (
						<>
							<ArrowRightIcon className='size-3 text-muted-foreground' aria-hidden />
							<span className='font-medium'>{status.remoteVersion}</span>
							{remoteKind && remoteKind !== "stable" ? <Badge variant='outline'>{t(channelLabel[remoteKind])}</Badge> : null}
						</>
					) : null}
				</div>
				{percent != null ? (
					<Progress value={percent}>
						<ProgressLabel className='sr-only'>{t("update.download")}</ProgressLabel>
						<ProgressValue>{() => `${Math.round(percent)}%${speed ? ` · ${speed}` : ""}`}</ProgressValue>
					</Progress>
				) : null}
			</header>
			<ScrollArea className='min-h-0 flex-1' viewportClassName='px-5 py-4'>
				{status.phase === "error" && status.error ? (
					<Alert variant='destructive'>
						<CircleAlertIcon />
						<AlertTitle>{t("update.updateFailed")}</AlertTitle>
						<AlertDescription>{status.error}</AlertDescription>
					</Alert>
				) : hasUpdate && status.remoteVersion ? (
					<section className='flex flex-col gap-2'>
						<h2 className='text-xs font-medium text-muted-foreground'>{t("update.whatsNew", { version: status.remoteVersion })}</h2>
						{notes?.body?.trim() ? <MarkdownBody markdown={notes.body} /> : <p className='text-sm text-muted-foreground'>{t("about.noNotes")}</p>}
					</section>
				) : null}
			</ScrollArea>
			<footer className='flex shrink-0 items-center gap-2 border-t bg-muted/50 px-4 py-3'>
				<div className='flex min-w-0 flex-1 items-center gap-2'>
					<span className='text-xs text-muted-foreground'>{t("update.channel")}</span>
					<UpdateChannelToggle
						value={channel}
						disabled={status.phase === "dev" || status.phase === "downloading" || saveSettings.isPending}
						onValueChange={(next) => {
							void selectChannel(next);
						}}
					/>
				</div>
				{status.phase === "ready" ? (
					<>
						<Button type='button' variant='outline' onClick={closeWindow}>
							{t("update.installOnQuit")}
						</Button>
						<Button
							type='button'
							loading={apply.isPending}
							onClick={() => {
								void apply.mutateAsync();
							}}>
							{t("update.restartNow")}
						</Button>
					</>
				) : (
					<>
						<Button type='button' variant='outline' onClick={closeWindow}>
							{t("common.close")}
						</Button>
						{status.phase === "available" ? (
							<Button
								type='button'
								loading={download.isPending}
								onClick={() => {
									void download.mutateAsync();
								}}>
								<DownloadIcon data-icon='inline-start' />
								{t("update.download")}
							</Button>
						) : status.phase !== "downloading" && status.phase !== "dev" ? (
							<Button
								type='button'
								loading={check.isPending || status.phase === "checking"}
								onClick={() => {
									void check.mutateAsync();
								}}>
								<RefreshCwIcon data-icon='inline-start' />
								{t("update.checkAgain")}
							</Button>
						) : null}
					</>
				)}
			</footer>
		</div>
	);
}
