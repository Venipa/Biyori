import { t } from "@biyori/translations/react";
import { PlayIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IdleColumnHeading } from "@/mainview/components/app/now-playing/column-heading";
import { ContinueWatchingCard, ContinueWatchingEmpty } from "@/mainview/components/app/now-playing/continue-card";
import { IdleItemContextMenu } from "@/mainview/components/app/now-playing/item-menu";
import { Button } from "@/mainview/components/ui/button";
import type { ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";

function episodeLine(item: ContinueWatchingItem): string {
	return item.episodes != null && item.episodes > 0
		? t("nowPlaying.episodeOf", { episode: item.nextEpisode, total: item.episodes })
		: t("nowPlaying.episodeNumber", { episode: item.nextEpisode });
}

function EarlierWatchingList({
	items,
	days,
	disabled,
	onOpen,
	onPlay,
}: {
	items: ContinueWatchingItem[];
	days: number;
	disabled?: boolean;
	onOpen: (item: ContinueWatchingItem) => void;
	onPlay: (item: ContinueWatchingItem) => void;
}) {
	const label = t("nowPlaying.olderThan", { days, count: days });
	return (
		<ScrollArea className='h-60 w-40 md:h-75 md:w-50' viewportClassName='overscroll-contain'>
			<ul aria-label={label} className='flex flex-col gap-0.5 pr-2'>
				{items.map((item) => (
					<li key={item.animeId}>
						<IdleItemContextMenu
							item={item}
							playNextEnabled={!disabled}
							render={
								<div className='flex h-10 items-center gap-1 pr-0.5 pl-1'>
									<button type='button' className='flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 text-left' onClick={() => onOpen(item)}>
										<span className='truncate text-xs leading-none'>{item.title}</span>
										<span className='truncate text-xs leading-none text-muted-foreground'>{episodeLine(item)}</span>
									</button>
									<Button
										type='button'
										variant='ghost'
										size='icon-sm'
										className='[&_svg]:size-3'
										disabled={disabled}
										aria-label={t("nowPlaying.playTitleEpisode", { title: item.title, episode: item.nextEpisode })}
										onClick={() => onPlay(item)}>
										<PlayIcon />
									</Button>
								</div>
							}
						/>
					</li>
				))}
			</ul>
		</ScrollArea>
	);
}

export function OlderWatchingColumn({
	days,
	items,
	disabled,
	onOpen,
	onPlay,
}: {
	days: number;
	items: ContinueWatchingItem[];
	disabled?: boolean;
	onOpen: (item: ContinueWatchingItem) => void;
	onPlay: (item: ContinueWatchingItem) => void;
}) {
	if (items.length === 0) {
		return null;
	}
	return (
		<section className='flex min-w-0 flex-col'>
			<IdleColumnHeading>{t("nowPlaying.olderThan", { days, count: days })}</IdleColumnHeading>
			<EarlierWatchingList items={items} days={days} disabled={disabled} onOpen={onOpen} onPlay={onPlay} />
		</section>
	);
}

export function IdlePosterStrip({
	heading,
	label,
	items,
	disabled,
	onActivate,
	description,
}: {
	heading?: string;
	label: string;
	items: ContinueWatchingItem[];
	disabled?: boolean;
	onActivate: (item: ContinueWatchingItem) => void;
	description?: (item: ContinueWatchingItem) => string;
}) {
	return (
		<ScrollArea className='h-auto min-w-0 max-w-full' viewportClassName='overflow-x-auto overflow-y-hidden'>
			<div className='flex w-max items-start gap-3'>
				<section className='flex flex-col'>
					{heading ? <IdleColumnHeading sticky>{heading}</IdleColumnHeading> : null}
					<ul aria-label={label} className='flex snap-x snap-mandatory items-start gap-3 pb-1'>
						{items.length === 0 ? (
							<li className='shrink-0 snap-start'>
								<ContinueWatchingEmpty className='h-60 w-40 md:h-75 md:w-50' />
							</li>
						) : (
							items.map((item) => (
								<li key={item.animeId} className='w-40 shrink-0 snap-start md:w-50'>
									<ContinueWatchingCard item={item} disabled={disabled} playNextEnabled description={description?.(item)} onActivate={() => onActivate(item)} />
								</li>
							))
						)}
					</ul>
				</section>
			</div>
		</ScrollArea>
	);
}
