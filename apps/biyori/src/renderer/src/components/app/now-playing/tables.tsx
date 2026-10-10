import { t, useTranslation } from "@biyori/translations/react";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { ContinueWatchingEmpty } from "@/mainview/components/app/now-playing/continue-card";
import { IdleItemContextMenu } from "@/mainview/components/app/now-playing/item-menu";
import { airingCaption } from "@/mainview/components/app/now-playing/utils";
import { Separator } from "@/mainview/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import type { AiringSoonGroup, ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";

export function TitleCellWithPoster({ item }: { item: ContinueWatchingItem }) {
	return (
		<TableCell className='group/poster relative w-full max-w-64 overflow-visible'>
			<span className='pointer-events-none invisible absolute top-1/2 left-full z-30 ml-2 -translate-y-1/2 group-hover/poster:visible'>
				<AnimeCover
					id={item.animeId}
					kind='cover'
					coverUrl={item.coverUrl}
					alt=''
					width={96}
					height={144}
					className='aspect-2/3 h-36 w-24 overflow-hidden rounded-md bg-muted shadow-md ring-1 ring-foreground/10'
				/>
			</span>
			<span className='block w-full min-w-0 truncate'>{item.title}</span>
		</TableCell>
	);
}

function nextEpisodeCaption(item: ContinueWatchingItem): string {
	return item.episodes != null && item.episodes > 0
		? t("nowPlaying.nextEpisodeOf", { episode: item.nextEpisode, total: item.episodes })
		: t("nowPlaying.nextEpisode", { episode: item.nextEpisode });
}

export function IdleWatchingTable({
	heading,
	items,
	playDisabled,
	onPlay,
}: {
	heading: string;
	items: ContinueWatchingItem[];
	playDisabled: boolean;
	onPlay: (item: ContinueWatchingItem) => void;
}) {
	return (
		<section>
			<h2 className='mb-1 text-sm font-semibold'>{heading}</h2>
			<Separator className='mb-2' />
			<Table containerClassName='overflow-visible'>
				<TableHeader>
					<TableRow>
						<TableHead>{t("nowPlaying.title")}</TableHead>
						<TableHead>{t("nowPlaying.episode")}</TableHead>
						<TableHead>{t("nowPlaying.type")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => (
						<IdleItemContextMenu
							key={item.animeId}
							item={item}
							playNextEnabled={!playDisabled}
							render={
								<TableRow
									className={playDisabled ? "opacity-50" : "cursor-pointer"}
									onClick={() => {
										if (!playDisabled) {
											onPlay(item);
										}
									}}>
									<TitleCellWithPoster item={item} />
									<TableCell className='text-muted-foreground'>{nextEpisodeCaption(item)}</TableCell>
									<TableCell className='text-muted-foreground'>{item.type ?? "-"}</TableCell>
								</TableRow>
							}
						/>
					))}
				</TableBody>
			</Table>
		</section>
	);
}

export function IdleTables({
	continueWatching,
	earlierWatching,
	olderWatching,
	earlierDays,
	airing,
	playDisabled,
	onPlay,
	onOpen,
	watchedLastWeek,
}: {
	continueWatching: ContinueWatchingItem[];
	earlierWatching: ContinueWatchingItem[];
	olderWatching: ContinueWatchingItem[];
	earlierDays: number;
	airing: AiringSoonGroup[];
	playDisabled: boolean;
	onPlay: (item: ContinueWatchingItem) => void;
	onOpen: (item: ContinueWatchingItem) => void;
	watchedLastWeek: number;
}) {
	const { t } = useTranslation();
	return (
		<div className='flex flex-col gap-6'>
			{continueWatching.length > 0 ? (
				<div className='flex flex-col gap-3'>
					<IdleWatchingTable heading={t("nowPlaying.continueWatching")} items={continueWatching} playDisabled={playDisabled} onPlay={onPlay} />
					{watchedLastWeek > 0 ? <p className='text-sm text-muted-foreground'>{t("nowPlaying.watchedLastWeek", { count: watchedLastWeek })}</p> : null}
				</div>
			) : (
				<section>
					<h2 className='mb-1 text-sm font-semibold'>{t("nowPlaying.continueWatching")}</h2>
					<Separator className='mb-2' />
					<ContinueWatchingEmpty className='min-h-32' />
				</section>
			)}
			{earlierWatching.length > 0 ? (
				<IdleWatchingTable heading={t("nowPlaying.earlierThan", { days: earlierDays, count: earlierDays })} items={earlierWatching} playDisabled={playDisabled} onPlay={onPlay} />
			) : null}
			{olderWatching.length > 0 ? (
				<IdleWatchingTable heading={t("nowPlaying.olderThan", { days: earlierDays, count: earlierDays })} items={olderWatching} playDisabled={playDisabled} onPlay={onPlay} />
			) : null}
			{airing.length > 0 ? (
				<section>
					<h2 className='mb-1 text-sm font-semibold'>{t("nowPlaying.airingSoon")}</h2>
					<Separator className='mb-2' />
					<Table containerClassName='overflow-visible'>
						<TableHeader>
							<TableRow>
								<TableHead>{t("nowPlaying.title")}</TableHead>
								<TableHead>{t("nowPlaying.airing")}</TableHead>
								<TableHead>{t("nowPlaying.type")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{airing.map((group) => (
								<IdleAiringDayRows key={group.label} group={group} onOpen={onOpen} />
							))}
						</TableBody>
					</Table>
				</section>
			) : null}
		</div>
	);
}

export function IdleAiringDayRows({ group, onOpen }: { group: AiringSoonGroup; onOpen: (item: ContinueWatchingItem) => void }) {
	return (
		<>
			<TableRow className='bg-muted hover:bg-muted'>
				<TableCell colSpan={3} className='py-1.5 text-sm font-semibold'>
					{group.label}
				</TableCell>
			</TableRow>
			{group.items.map((item) => (
				<IdleItemContextMenu
					key={item.animeId}
					item={item}
					playNextEnabled={false}
					render={
						<TableRow
							className='cursor-pointer'
							onClick={() => {
								onOpen(item);
							}}>
							<TitleCellWithPoster item={item} />
							<TableCell className='text-muted-foreground'>{airingCaption(item)}</TableCell>
							<TableCell className='text-muted-foreground'>{item.type ?? "-"}</TableCell>
						</TableRow>
					}
				/>
			))}
		</>
	);
}
