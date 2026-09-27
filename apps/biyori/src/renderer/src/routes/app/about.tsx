import { createFileRoute } from "@tanstack/react-router";
import { AlertCircleIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { desktopRpc } from "@/desktop-rpc";
import { Changelog } from "@/mainview/components/app/about/changelog";
import { UpdateChannelToggle } from "@/mainview/components/app/update/channel-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Card, CardContent, CardFooter } from "@/mainview/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/mainview/components/ui/field";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { getVersionChannel, parseUpdateChannel, UPDATE_CHANNEL_LABELS, type UpdateChannel } from "@/shared/updater";
import hanaRender from "../../../../../resources/biyori-render.png";

const AUTHOR = "Venipa";
const CONTRIBUTORS = [AUTHOR];

function contributorsWithAuthorFirst(logins: readonly string[]): string[] {
	const rest = logins.filter((login) => login !== AUTHOR);
	return [AUTHOR, ...rest.toSorted((left, right) => left.localeCompare(right))];
}

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
	const contributors = contributorsWithAuthorFirst(CONTRIBUTORS);

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
							<dt className='self-center text-muted-foreground'>Contributors</dt>
							<dd className='flex flex-wrap items-center gap-1.5 self-center'>
								{contributors.map((login) => (
									<button
										key={login}
										type='button'
										className='inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'
										onClick={() => {
											void desktopRpc.request.openExternal({ url: `https://github.com/${login}` });
										}}>
										<img src={`https://github.com/${login}.png?size=64`} alt='' className='size-6 rounded-full ring-1 ring-foreground/10' />
										{login}
									</button>
								))}
							</dd>
							<dt className='text-muted-foreground'>Updates</dt>
							<dd className={cn("min-w-0 break-words", status.error ? "text-destructive" : "")}>{status.message || "Not checked yet"}</dd>
							<div className='pb-6'></div>
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
