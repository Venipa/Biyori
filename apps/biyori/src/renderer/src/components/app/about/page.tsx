import { useTranslation } from "@biyori/translations/react";
import { AlertCircleIcon, BugIcon, CheckIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, RefreshCwIcon, ScaleIcon } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { desktopRpc } from "@/desktop-rpc";
import { Changelog } from "@/mainview/components/app/about/changelog";
import { UpdateChannelToggle } from "@/mainview/components/app/update/channel-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Card, CardContent } from "@/mainview/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/mainview/components/ui/progress";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { formatTransferRate, getVersionChannel, parseUpdateChannel, type UpdateChannel } from "@/shared/updater";
import hanaRender from "../../../../../../resources/biyori-render.png";

const AUTHOR = "Venipa";
const CONTRIBUTORS = [AUTHOR];
const REPO_URL = "https://github.com/Venipa/biyori";

const channelLabel = { stable: "update.stable", beta: "update.beta", alpha: "update.alpha" } as const;

function contributorsWithAuthorFirst(logins: readonly string[]): string[] {
	const rest = logins.filter((login) => login !== AUTHOR);
	return [AUTHOR, ...rest.toSorted((left, right) => left.localeCompare(right))];
}

function openExternal(url: string) {
	void desktopRpc.request.openExternal({ url });
}

export function AboutPage() {
	const { t } = useTranslation();
	const status = useUpdateStatus();
	const about = trpc.about.useQuery();
	const settingsQuery = trpc.settings.get.useQuery();
	const utils = trpc.useUtils();
	const { mutateAsync: patchSettings, isPending: isSavingChannel } = trpc.settings.set.useMutation();
	const check = trpc.updater.check.useMutation();
	const download = trpc.updater.download.useMutation();
	const apply = trpc.updater.restartAndApply.useMutation();
	const changelog = trpc.updater.changelog.useQuery();
	const [copied, setCopied] = useState(false);
	const channel = parseUpdateChannel(settingsQuery.data?.updateChannel ?? status.localChannel);
	const buildChannel = getVersionChannel(status.localVersion) ?? parseUpdateChannel(status.buildChannel);
	const contributors = contributorsWithAuthorFirst(CONTRIBUTORS);
	const checking = check.isPending || status.phase === "checking";
	const progress = status.phase === "downloading" ? status.progress : null;
	const percent = progress && Number.isFinite(progress.percent) ? Math.max(0, Math.min(100, progress.percent)) : null;
	const speed = progress && Number.isFinite(progress.bytesPerSecond) ? formatTransferRate(progress.bytesPerSecond) : null;
	const hash = status.localHash ? status.localHash.slice(0, 12) : "";

	async function selectChannel(next: UpdateChannel) {
		await patchSettings({ updateChannel: next });
		await utils.settings.get.invalidate();
		await utils.updater.changelog.invalidate();
	}

	async function copyDebugInfo() {
		const lines = [
			`Biyori ${status.localVersion} (${channel})`,
			`Build ${status.localHash || "-"}`,
			`Hana ${about.data?.hanaVersion ?? "-"}`,
			`Electron ${about.data?.electronVersion ?? "-"}`,
			`OS ${about.data?.os ?? "-"}`,
		];
		try {
			await navigator.clipboard.writeText(lines.join("\n"));
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* ignore clipboard failures */
		}
	}

	return (
		<ScrollArea className='h-full' viewportClassName='flex flex-col gap-4 p-4'>
			<Card className='max-w-3xl shrink-0 overflow-visible'>
				<CardContent className='flex items-end gap-6'>
					<div className='flex min-w-0 flex-1 flex-col gap-4 self-stretch'>
						<div>
							<h1 className='text-lg font-semibold'>{t("about.appName")}</h1>
							<p className='text-sm text-muted-foreground'>{t("about.tagline")}</p>
						</div>
						<div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
							<span className='font-medium tabular-nums'>{status.localVersion || t("about.pending")}</span>
							{buildChannel ? <Badge variant='outline'>{t(channelLabel[buildChannel])}</Badge> : null}
							{hash ? <span className='font-mono text-xs text-muted-foreground'>{hash}</span> : null}
							{about.data?.hanaVersion ? (
								<span className='text-xs text-muted-foreground'>
									{t("about.hana")} {about.data.hanaVersion}
								</span>
							) : null}
						</div>
						<div className='flex flex-wrap items-center gap-1.5'>
							{contributors.map((login) => (
								<button
									key={login}
									type='button'
									className='inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'
									onClick={() => openExternal(`https://github.com/${login}`)}>
									<img src={`https://github.com/${login}.png?size=64`} alt='' className='size-6 rounded-full ring-1 ring-foreground/10' />
									{login}
								</button>
							))}
						</div>
						<div className='mt-auto flex flex-wrap gap-2'>
							<Button type='button' variant='outline' size='sm' onClick={() => openExternal(REPO_URL)}>
								<ExternalLinkIcon data-icon='inline-start' />
								{t("about.github")}
							</Button>
							<Button type='button' variant='outline' size='sm' onClick={() => openExternal(`${REPO_URL}/issues/new`)}>
								<BugIcon data-icon='inline-start' />
								{t("about.reportIssue")}
							</Button>
							{/* shortcut: links the project license only, bundle third-party notices if a license view is required */}
							<Button type='button' variant='outline' size='sm' onClick={() => openExternal(`${REPO_URL}/blob/master/LICENSE`)}>
								<ScaleIcon data-icon='inline-start' />
								{t("about.licenses")}
							</Button>
							<Button type='button' variant='ghost' size='sm' onClick={() => void copyDebugInfo()}>
								{copied ? <CheckIcon data-icon='inline-start' /> : <CopyIcon data-icon='inline-start' />}
								{copied ? t("about.copied") : t("about.copyDebugInfo")}
							</Button>
						</div>
					</div>
					<img src={hanaRender} alt='' className='h-52 w-auto max-w-[13rem] shrink-0 object-contain object-bottom select-none' draggable={false} />
				</CardContent>
			</Card>
			<Card className='max-w-3xl shrink-0'>
				<CardContent className='flex flex-col gap-3'>
					<div className='flex flex-wrap items-center gap-3'>
						<div className='min-w-0 flex-1'>
							<h2 className='text-sm font-semibold'>{t("about.updates")}</h2>
							<p className={cn("text-sm break-words", status.phase === "error" ? "text-destructive" : "text-muted-foreground")}>{status.message || t("about.notChecked")}</p>
						</div>
						<UpdateChannelToggle value={channel} disabled={isSavingChannel || checking || status.phase === "downloading"} onValueChange={(next) => void selectChannel(next)} />
						{status.phase === "ready" ? (
							<Button type='button' loading={apply.isPending} onClick={() => void apply.mutateAsync()}>
								{t("update.restartNow")}
							</Button>
						) : status.phase === "available" ? (
							<Button type='button' loading={download.isPending} onClick={() => void download.mutateAsync()}>
								<DownloadIcon data-icon='inline-start' />
								{t("update.download")}
							</Button>
						) : status.phase !== "downloading" && status.phase !== "dev" ? (
							<Button type='button' variant='outline' loading={checking} onClick={() => void check.mutateAsync()}>
								<RefreshCwIcon data-icon='inline-start' />
								{t("about.checkForUpdates")}
							</Button>
						) : null}
					</div>
					{percent != null ? (
						<Progress value={percent}>
							<ProgressLabel className='sr-only'>{t("update.download")}</ProgressLabel>
							<ProgressValue>{() => `${Math.round(percent)}%${speed ? ` · ${speed}` : ""}`}</ProgressValue>
						</Progress>
					) : null}
				</CardContent>
			</Card>
			{status.error && status.error !== status.message ? (
				<Alert variant='destructive' className='max-w-3xl'>
					<AlertCircleIcon />
					<AlertTitle>{t("about.updateCheckFailed")}</AlertTitle>
					<AlertDescription>{status.error}</AlertDescription>
				</Alert>
			) : null}
			<Changelog changelog={changelog.data} isLoading={changelog.isPending} queryError={changelog.isError} installedVersion={status.localVersion} />
		</ScrollArea>
	);
}
