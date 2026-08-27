import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { RefreshCwIcon } from "lucide-react";
import { useEffect } from "react";
import { desktopRpc } from "@/desktop-rpc";
import { MarkdownBody } from "@/mainview/components/markdown-body";
import { Button } from "@/mainview/components/ui/button";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";

type ChangelogData = inferRouterOutputs<AppRouter>["updater"]["changelog"];

export const Route = createFileRoute("/app/about")({
	component: AboutPage,
});

function AboutPage() {
	const status = useUpdateStatus();
	const { mutateAsync: checkForUpdates, isPending } = trpc.updater.check.useMutation();
	const changelog = trpc.updater.changelog.useQuery();

	useEffect(() => {
		void checkForUpdates();
	}, [checkForUpdates]);

	return (
		<div className='flex h-full flex-col gap-4 overflow-auto p-4'>
			<div>
				<h1 className='text-lg font-semibold'>About Biyori</h1>
				<p className='text-sm text-muted-foreground'>Anime list tracker powered by AniList.</p>
			</div>
			<dl className='grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm'>
				<dt className='text-muted-foreground'>Version</dt>
				<dd>{status.localVersion || "..."}</dd>
				<dt className='text-muted-foreground'>Channel</dt>
				<dd>{status.localChannel || "..."}</dd>
				<dt className='text-muted-foreground'>Build</dt>
				<dd className='truncate font-mono text-xs'>{status.localHash ? status.localHash.slice(0, 12) : "..."}</dd>
				<dt className='text-muted-foreground'>Updates</dt>
				<dd>{status.message || "Not checked yet"}</dd>
			</dl>
			{status.error ? <p className='text-sm text-destructive'>{status.error}</p> : null}
			<div className='flex flex-wrap gap-2'>
				<Button
					type='button'
					variant='outline'
					disabled={isPending || status.phase === "checking"}
					onClick={() => {
						void checkForUpdates();
					}}>
					<RefreshCwIcon data-icon='inline-start' />
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
			<Changelog changelog={changelog.data} isLoading={changelog.isPending} queryError={changelog.error?.message ?? null} />
		</div>
	);
}

function Changelog({
	changelog,
	isLoading,
	queryError,
}: {
	changelog: ChangelogData | undefined;
	isLoading: boolean;
	queryError: string | null;
}) {
	return (
		<div className='flex max-w-2xl flex-col gap-3'>
			<h2 className='text-sm font-semibold'>Changelog</h2>
			{isLoading ? <p className='text-sm text-muted-foreground'>Loading changelog...</p> : null}
			{queryError ? <p className='text-sm text-destructive'>Could not load changelog</p> : null}
			{changelog && !changelog.ok ? <p className='text-sm text-destructive'>{changelog.error}</p> : null}
			{changelog?.ok && changelog.items.length === 0 ? <p className='text-sm text-muted-foreground'>No releases for this channel</p> : null}
			{changelog?.ok
				? changelog.items.map((item) => (
						<section key={item.tag_name} className='flex flex-col gap-1'>
							<h3 className='text-sm font-medium'>{item.name || item.tag_name}</h3>
							{item.body?.trim() ? <MarkdownBody markdown={item.body} /> : <p className='text-sm text-muted-foreground'>No notes</p>}
						</section>
					))
				: null}
		</div>
	);
}
