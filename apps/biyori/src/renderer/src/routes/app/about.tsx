import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { AlertCircleIcon, RefreshCwIcon, ScrollTextIcon } from "lucide-react";
import { desktopRpc } from "@/desktop-rpc";
import { MarkdownBody } from "@/mainview/components/markdown-body";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/mainview/components/ui/field";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Spinner } from "@/mainview/components/ui/spinner";
import { UpdateChannelToggle } from "@/mainview/components/update-channel-toggle";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { getVersionChannel, parseUpdateChannel, UPDATE_CHANNEL_LABELS, type UpdateChannel } from "@/shared/updater";

type ChangelogData = inferRouterOutputs<AppRouter>["updater"]["changelog"];

export const Route = createFileRoute("/app/about")({
	component: AboutPage,
});

function AboutPage() {
	const status = useUpdateStatus();
	const about = trpc.about.useQuery();
	const settingsQuery = trpc.settings.get.useQuery();
	const utils = trpc.useUtils();
	const { mutateAsync: checkForUpdates, isPending: isChecking } = trpc.updater.check.useMutation();
	const { mutateAsync: patchSettings, isPending: isSavingChannel } = trpc.settings.set.useMutation();
	const changelog = trpc.updater.changelog.useQuery();
	const channel = parseUpdateChannel(settingsQuery.data?.updateChannel ?? status.localChannel);
	const buildChannel = getVersionChannel(status.localVersion) ?? parseUpdateChannel(status.buildChannel);
	const checking = isChecking || status.phase === "checking";

	async function selectChannel(next: UpdateChannel) {
		await patchSettings({ updateChannel: next });
		await utils.settings.get.invalidate();
		await utils.updater.changelog.invalidate();
	}

	return (
		<div className='flex h-full flex-col gap-6 overflow-auto p-4'>
			<div>
				<h1 className='text-lg font-semibold'>About Biyori</h1>
				<p className='text-sm text-muted-foreground'>Anime list tracker powered by AniList.</p>
			</div>
			<FieldGroup className='max-w-xl'>
				<dl className='grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-sm'>
					<dt className='text-muted-foreground'>Version</dt>
					<dd className='flex flex-wrap items-center gap-2'>
						<span>{status.localVersion || "..."}</span>
						{buildChannel ? <Badge variant='outline'>{UPDATE_CHANNEL_LABELS[buildChannel]}</Badge> : null}
					</dd>
					<dt className='text-muted-foreground'>Build</dt>
					<dd className='truncate font-mono text-xs'>{status.localHash ? status.localHash.slice(0, 12) : "..."}</dd>
					<dt className='text-muted-foreground'>Hana</dt>
					<dd>{about.data?.hanaVersion || "..."}</dd>
					<dt className='text-muted-foreground'>Updates</dt>
					<dd className={status.error ? "min-w-0 break-words text-destructive" : "min-w-0 break-words"}>{status.message || "Not checked yet"}</dd>
				</dl>
				<Field>
					<FieldLabel>Update channel</FieldLabel>
					<UpdateChannelToggle value={channel} disabled={isSavingChannel || checking} onValueChange={(next) => void selectChannel(next)} />
				</Field>
			</FieldGroup>
			{status.error && status.error !== status.message ? (
				<Alert variant='destructive' className='max-w-xl'>
					<AlertCircleIcon />
					<AlertTitle>Update check failed</AlertTitle>
					<AlertDescription>{status.error}</AlertDescription>
				</Alert>
			) : null}
			<div className='flex flex-wrap gap-2'>
				<Button
					type='button'
					variant='outline'
					disabled={checking}
					onClick={() => {
						void checkForUpdates();
					}}>
					{checking ? <Spinner data-icon='inline-start' size='xs' /> : <RefreshCwIcon data-icon='inline-start' />}
					Check for updates
				</Button>
				{status.updateAvailable ? (
					<Button
						type='button'
						onClick={() => {
							void desktopRpc.request.openUpdate({});
						}}>
						Open update
					</Button>
				) : null}
			</div>
			<Changelog changelog={changelog.data} isLoading={changelog.isPending} queryError={changelog.isError} />
		</div>
	);
}

function Changelog({ changelog, isLoading, queryError }: { changelog: ChangelogData | undefined; isLoading: boolean; queryError: boolean }) {
	return (
		<div className='flex max-w-2xl flex-col gap-3'>
			<h2 className='text-sm font-semibold'>Changelog</h2>
			{isLoading ? (
				<div className='flex flex-col gap-2'>
					<Skeleton className='h-3 w-1/3' />
					<Skeleton className='h-3 w-full' />
					<Skeleton className='h-3 w-5/6' />
				</div>
			) : queryError || (changelog && !changelog.ok) ? (
				<Alert variant='destructive'>
					<AlertCircleIcon />
					<AlertTitle>Could not load changelog</AlertTitle>
					<AlertDescription>{changelog && !changelog.ok ? changelog.error : "Try again later."}</AlertDescription>
				</Alert>
			) : changelog?.ok && changelog.items.length === 0 ? (
				<Empty className='border border-dashed'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<ScrollTextIcon />
						</EmptyMedia>
						<EmptyTitle>No releases for this channel</EmptyTitle>
						<EmptyDescription>Switch channel or publish a matching GitHub release.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : changelog?.ok ? (
				changelog.items.map((item) => {
					const kind = getVersionChannel(item.version);
					return (
						<section key={item.version} className='flex flex-col gap-1'>
							<div className='flex flex-wrap items-center gap-2'>
								<h3 className='text-sm font-medium'>{item.name || `v${item.version}`}</h3>
								{kind ? <Badge variant={kind === "stable" ? "default" : "outline"}>{UPDATE_CHANNEL_LABELS[kind]}</Badge> : null}
							</div>
							{item.body?.trim() ? <MarkdownBody markdown={item.body} /> : <p className='text-sm text-muted-foreground'>No notes</p>}
						</section>
					);
				})
			) : null}
		</div>
	);
}
