import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { ContinueWatchingEmpty } from "@/mainview/components/app/now-playing/continue-card";
import { IdleItemContextMenu } from "@/mainview/components/app/now-playing/item-menu";
import { airingCaption, earlierThanLabel } from "@/mainview/components/app/now-playing/utils";
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

export function IdleTables({
	continueWatching,
	earlierWatching,
	earlierDays,
	airing,
	playDisabled,
	onPlay,
	onOpen,
	watchedLastWeek,
}: {
	continueWatching: ContinueWatchingItem[];
	earlierWatching: ContinueWatchingItem[];
	earlierDays: number;
	airing: AiringSoonGroup[];
	playDisabled: boolean;
	onPlay: (item: ContinueWatchingItem) => void;
	onOpen: (item: ContinueWatchingItem) => void;
	watchedLastWeek: number;
}) {
	return (
		<div className='flex flex-col gap-6'>
			<section>
				<h2 className='mb-1 text-sm font-semibold'>Continue watching</h2>
				<Separator className='mb-2' />
				{continueWatching.length > 0 ? (
					<>
						<Table containerClassName='overflow-visible'>
							<TableHeader>
								<TableRow>
									<TableHead>Title</TableHead>
									<TableHead>Episode</TableHead>
									<TableHead>Type</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{continueWatching.map((item) => (
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
												<TableCell className='text-muted-foreground'>
													Next episode {item.nextEpisode}
													{item.episodes != null && item.episodes > 0 ? ` of ${item.episodes}` : ""}
												</TableCell>
												<TableCell className='text-muted-foreground'>{item.type ?? "-"}</TableCell>
											</TableRow>
										}
									/>
								))}
							</TableBody>
						</Table>
						{watchedLastWeek > 0 ? (
							<p className='mt-3 text-sm text-muted-foreground'>
								You've watched {watchedLastWeek} episode
								{watchedLastWeek === 1 ? "" : "s"} last week.
							</p>
						) : null}
					</>
				) : (
					<ContinueWatchingEmpty className='min-h-32' />
				)}
			</section>
			{earlierWatching.length > 0 ? (
				<section>
					<h2 className='mb-1 text-sm font-semibold'>{earlierThanLabel(earlierDays)}</h2>
					<Separator className='mb-2' />
					<Table containerClassName='overflow-visible'>
						<TableHeader>
							<TableRow>
								<TableHead>Title</TableHead>
								<TableHead>Episode</TableHead>
								<TableHead>Type</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{earlierWatching.map((item) => (
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
											<TableCell className='text-muted-foreground'>
												Next episode {item.nextEpisode}
												{item.episodes != null && item.episodes > 0 ? ` of ${item.episodes}` : ""}
											</TableCell>
											<TableCell className='text-muted-foreground'>{item.type ?? "-"}</TableCell>
										</TableRow>
									}
								/>
							))}
						</TableBody>
					</Table>
				</section>
			) : null}
			{airing.length > 0 ? (
				<section>
					<h2 className='mb-1 text-sm font-semibold'>Airing soon</h2>
					<Separator className='mb-2' />
					<Table containerClassName='overflow-visible'>
						<TableHeader>
							<TableRow>
								<TableHead>Title</TableHead>
								<TableHead>Airing</TableHead>
								<TableHead>Type</TableHead>
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
