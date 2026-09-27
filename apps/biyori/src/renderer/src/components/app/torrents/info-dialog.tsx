import { CircleHelpIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";
import type { ReactElement } from "react";
import { AiringStatusMark } from "@/components/app/anime/airing-status";
import { desktopRpc } from "@/desktop-rpc";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { countLabel, type TorrentRow } from "@/mainview/components/app/torrents/row";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/mainview/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/mainview/components/ui/empty";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { formatLocalDateTime } from "@/mainview/lib/format-date";

export function FactList({ facts }: { facts: Array<{ label: string; value: string }> }): ReactElement | null {
	if (facts.length === 0) {
		return null;
	}
	return (
		<div className='min-w-0 w-full text-sm'>
			{facts.map((fact) => (
				<div key={fact.label} className='flex min-w-0 gap-3 border-b border-border/60 py-1 last:border-0'>
					<div className='w-24 shrink-0 font-medium text-muted-foreground'>{fact.label}</div>
					<div className='min-w-0 flex-1 break-all'>{fact.value}</div>
				</div>
			))}
		</div>
	);
}

export function TorrentInfoDialog({
	row,
	onOpenChange,
	onDownload,
	onViewAnime,
}: {
	row: TorrentRow | null;
	onOpenChange: (open: boolean) => void;
	onDownload: (row: TorrentRow) => void;
	onViewAnime: (id: number) => void;
}): ReactElement {
	const matched = Boolean(row?.matched && row.animeId != null);
	const releaseFacts = row?.parse ?? [];
	return (
		<Dialog open={row != null} onOpenChange={onOpenChange}>
			<DialogContent className='flex max-h-[min(90vh,40rem)] min-w-0 flex-col overflow-hidden px-0 pb-0 sm:max-w-lg' showCloseButton>
				<DialogHeader className='min-w-0 shrink-0 px-4'>
					<DialogTitle className='pr-8 leading-snug break-all' title={row?.title}>
						{row?.title ?? "Torrent"}
					</DialogTitle>
					<DialogDescription className='flex min-w-0 flex-wrap items-center gap-1 text-xs'>
						<Badge variant='ghost' className='h-5 px-1 py-0 text-xs tabular-nums text-muted-foreground'>
							{row?.size || "Unknown size"}
						</Badge>
						<Badge variant='ghost' className='h-5 bg-emerald-500/10 px-1 py-0 text-xs tabular-nums text-emerald-700 dark:text-emerald-400'>
							S {countLabel(row?.seeders ?? null)}
						</Badge>
						<Badge variant='ghost' className='h-5 bg-amber-500/10 px-1 py-0 text-xs tabular-nums text-amber-700 dark:text-amber-400'>
							L {countLabel(row?.leechers ?? null)}
						</Badge>
						<Badge variant='ghost' className='h-5 bg-sky-500/10 px-1 py-0 text-xs tabular-nums text-sky-700 dark:text-sky-400'>
							D {countLabel(row?.downloads ?? null)}
						</Badge>
						{row?.pubDate ? (
							<Badge variant='ghost' className='h-5 px-1 py-0 text-xs tabular-nums text-muted-foreground'>
								{formatLocalDateTime(row.pubDate)}
							</Badge>
						) : null}
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className='h-[min(calc(90vh-11rem),28rem)] max-h-[min(calc(90vh-11rem),28rem)] min-h-0 overflow-hidden' viewportClassName='h-full overflow-y-auto'>
					<div className='flex min-w-0 flex-col gap-4 px-4 pb-4'>
						{matched && row?.animeId != null ? (
							<div className='flex min-w-0 flex-col gap-1.5'>
								<p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Anime</p>
								<Button
									type='button'
									variant='outline'
									className='h-auto w-full min-w-0 items-center justify-start gap-3 overflow-hidden px-2 py-2 text-left font-normal whitespace-normal'
									onClick={() => {
										if (row.animeId == null) {
											return;
										}
										onViewAnime(row.animeId);
									}}>
									<AnimeCover
										id={row.animeId}
										coverUrl={row.coverUrl || undefined}
										alt=''
										lazy
										width={40}
										height={60}
										className='aspect-2/3 w-10 shrink-0 overflow-hidden rounded-md bg-muted'
									/>
									<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
										<span className='flex min-w-0 items-center gap-2'>
											<AiringStatusMark status={row.airingStatus || null} shape='dot' />
											<span className='min-w-0 truncate text-sm font-medium' title={row.animeTitle}>
												{row.animeTitle}
											</span>
										</span>
										<span className='truncate text-xs text-muted-foreground'>
											{row.episode != null ? `Episode ${row.episode}` : "Episode unknown"}
											{row.group ? ` · ${row.group}` : ""}
											{row.videoFormat ? ` · ${row.videoFormat}` : ""}
										</span>
									</span>
								</Button>
							</div>
						) : (
							<Empty className='border border-dashed p-4'>
								<EmptyHeader>
									<EmptyMedia variant='icon'>
										<CircleHelpIcon />
									</EmptyMedia>
									<EmptyTitle>Unknown anime detected</EmptyTitle>
									<EmptyDescription>This release is not on your list.</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
						{releaseFacts.length ? (
							<div className='flex min-w-0 flex-col gap-1.5'>
								<p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Release</p>
								<FactList facts={releaseFacts} />
							</div>
						) : null}
					</div>
				</ScrollArea>
				<DialogFooter className='shrink-0 sm:justify-between'>
					<Button
						type='button'
						disabled={!row?.link}
						onClick={() => {
							if (row) {
								onDownload(row);
							}
						}}>
						<DownloadIcon data-icon='inline-start' />
						Download
					</Button>
					<Button
						type='button'
						variant='outline'
						disabled={!row?.infoLink}
						onClick={() => {
							if (!row?.infoLink) {
								return;
							}
							void desktopRpc.request.openExternal({ url: row.infoLink });
						}}>
						Torrent Post
						<ExternalLinkIcon data-icon='inline-end' />
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
