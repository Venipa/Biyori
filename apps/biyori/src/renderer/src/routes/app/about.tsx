import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { AlertCircleIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { desktopRpc } from "@/desktop-rpc";
import { MarkdownBody } from "@/mainview/components/markdown-body";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Card, CardContent, CardFooter } from "@/mainview/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/mainview/components/ui/field";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { UpdateChannelToggle } from "@/mainview/components/update-channel-toggle";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { getVersionChannel, parseUpdateChannel, UPDATE_CHANNEL_LABELS, type UpdateChannel } from "@/shared/updater";
import hanaRender from "../../../../../resources/biyori-render.png";

type ChangelogData = inferRouterOutputs<AppRouter>["updater"]["changelog"];

export const Route = createFileRoute("/app/about")({
	component: AboutPage,
});
const isTest = import.meta.env.VITE_SHOW_UPDATE_BUTTON === "true";

function AboutPage() {
	const status = useUpdateStatus();
	const checking = status.phase === "checking";
	const about = trpc.about.useQuery();
	const settingsQuery = trpc.settings.get.useQuery();
	const utils = trpc.useUtils();
	const { mutateAsync: patchSettings, isPending: isSavingChannel } = trpc.settings.set.useMutation();
	const changelog = trpc.updater.changelog.useQuery();
	const channel = parseUpdateChannel(settingsQuery.data?.updateChannel ?? status.localChannel);
	const buildChannel = getVersionChannel(status.localVersion) ?? parseUpdateChannel(status.buildChannel);

	async function selectChannel(next: UpdateChannel) {
		await patchSettings({ updateChannel: next });
		await utils.settings.get.invalidate();
		await utils.updater.changelog.invalidate();
	}

	return (
		<ScrollArea className='h-full' viewportClassName='flex flex-col gap-6 p-4'>
			<Card className='max-w-3xl shrink-0 overflow-visible gap-0'>
				<CardContent className='flex items-end gap-6'>
					<div className='min-w-0 flex-1 self-stretch'>
						<h1 className='text-lg font-semibold'>Biyori</h1>
						<p className='text-sm text-muted-foreground'>Anime list tracker powered by AniList.</p>
						<dl className='mt-4 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-sm'>
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
							<dd className={cn("min-w-0 break-words", status.error ? "text-destructive" : "")}>{status.message || "Not checked yet"}</dd>
						</dl>
					</div>
					<img src={hanaRender} alt='' className='h-52 w-auto max-w-[13rem] shrink-0 object-contain object-bottom select-none' draggable={false} />
				</CardContent>
				<CardFooter className='flex items-end gap-3'>
					<FieldGroup className='min-w-0 flex-1'>
						<Field>
							<FieldLabel>Update channel</FieldLabel>
							<UpdateChannelToggle value={channel} disabled={isSavingChannel || checking} onValueChange={(next) => void selectChannel(next)} />
						</Field>
					</FieldGroup>
					{status.updateAvailable || isTest ? (
						<Button
							type='button'
							onClick={() => {
								void desktopRpc.request.openUpdate({});
							}}>
							Open update
						</Button>
					) : null}
				</CardFooter>
			</Card>
			{status.error && status.error !== status.message ? (
				<Alert variant='destructive' className='max-w-3xl'>
					<AlertCircleIcon />
					<AlertTitle>Update check failed</AlertTitle>
					<AlertDescription>{status.error}</AlertDescription>
				</Alert>
			) : null}
			<Changelog changelog={changelog.data} isLoading={changelog.isPending} queryError={changelog.isError} />
		</ScrollArea>
	);
}

function formatReleaseDate(iso: string | null): string {
	if (!iso) {
		return "";
	}
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toISOString().slice(0, 10);
}

function Changelog({ changelog, isLoading, queryError }: { changelog: ChangelogData | undefined; isLoading: boolean; queryError: boolean }) {
	return (
		<div className='flex max-w-3xl flex-col gap-3'>
			<div>
				<h2 className='text-sm font-semibold'>Changelog</h2>
				<p className='text-sm text-muted-foreground'>Recent releases for this channel.</p>
			</div>
			{isLoading ? (
				<div className='divide-y rounded-xl ring-1 ring-foreground/10'>
					{["a", "b", "c"].map((row) => (
						<div key={row} className='grid grid-cols-[7rem_minmax(0,1fr)] gap-4 px-4 py-3'>
							<Skeleton className='h-3 w-20' />
							<div className='flex flex-col gap-2'>
								<Skeleton className='h-3 w-1/3' />
								<Skeleton className='h-3 w-full' />
								<Skeleton className='h-3 w-5/6' />
							</div>
						</div>
					))}
				</div>
			) : queryError || (changelog && !changelog.ok) ? (
				<Alert variant='destructive'>
					<AlertCircleIcon />
					<AlertTitle>Could not load changelog</AlertTitle>
					<AlertDescription>{changelog && !changelog.ok ? changelog.error : "Try again later."}</AlertDescription>
				</Alert>
			) : changelog?.ok && changelog.items.length === 0 ? (
				<div className='rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10'>
					<p>No releases for this channel.</p>
					<p>Switch channel or publish a matching GitHub release.</p>
				</div>
			) : changelog?.ok ? (
				<div className='divide-y rounded-xl ring-1 ring-foreground/10'>
					{changelog.items.map((item) => {
						const kind = getVersionChannel(item.version);
						const published = formatReleaseDate(item.publishedAt);
						return (
							<section key={item.version} className='grid grid-cols-[7rem_minmax(0,1fr)] gap-4 px-4 py-3'>
								<time className='pt-0.5 text-sm text-muted-foreground' dateTime={item.publishedAt ?? undefined}>
									{published || "-"}
								</time>
								<div className='min-w-0'>
									<div className='flex flex-wrap items-center gap-2'>
										<h3 className='text-sm font-medium'>{item.name || `v${item.version}`}</h3>
										{kind ? <Badge variant={kind === "stable" ? "default" : "outline"}>{UPDATE_CHANNEL_LABELS[kind]}</Badge> : null}
									</div>
									{item.body?.trim() ? <MarkdownBody markdown={item.body} /> : <p className='text-sm text-muted-foreground'>No notes</p>}
								</div>
							</section>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
