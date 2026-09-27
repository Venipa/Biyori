import type { inferRouterOutputs } from "@trpc/server";
import { AlertCircleIcon } from "lucide-react";
import { MarkdownBody } from "@/mainview/components/app/shared/markdown-body";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import type { AppRouter } from "@/shared/app-router";
import { getVersionChannel, UPDATE_CHANNEL_LABELS } from "@/shared/updater";

type ChangelogData = inferRouterOutputs<AppRouter>["updater"]["changelog"];

export function formatReleaseDate(iso: string | null): string {
	if (!iso) {
		return "";
	}
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toISOString().slice(0, 10);
}

export function Changelog({ changelog, isLoading, queryError }: { changelog: ChangelogData | undefined; isLoading: boolean; queryError: boolean }) {
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
			) : changelog?.ok && (changelog.items?.length ?? 0) === 0 ? (
				<div className='rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10'>
					<p>No releases for this channel.</p>
					<p>Switch channel or publish a matching GitHub release.</p>
				</div>
			) : changelog?.ok && changelog.items ? (
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
