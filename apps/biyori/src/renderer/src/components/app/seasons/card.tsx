import type { SeasonItem, SeasonSortBy, SeasonViewAs } from "@/lib/schemas/seasons";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { AnimeItemCommands } from "@/mainview/components/app/anime-info/item-commands";
import { Button } from "@/mainview/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/mainview/components/ui/context-menu";
import { airingBarClass, formatAiredRange, formatPopularity, formatScore, imageFooterText } from "@/mainview/lib/season-view";
import { cn } from "@/mainview/lib/utils";
import type { ListStatus } from "@/shared/list";

const commandParts = {
	Item: ContextMenuItem,
	Sub: ContextMenuSub,
	SubTrigger: ContextMenuSubTrigger,
	SubContent: ContextMenuSubContent,
	Separator: ContextMenuSeparator,
	Shortcut: ContextMenuShortcut,
};

export function SeasonCard(props: {
	item: SeasonItem;
	viewAs: SeasonViewAs;
	sortBy: SeasonSortBy;
	listStatus: ListStatus | null;
	onOpen: () => void;
	onAdd: () => void;
	adding: boolean;
}) {
	const { item, viewAs, sortBy, listStatus, onOpen, onAdd, adding } = props;
	const bar = airingBarClass(item.status);
	const inList = listStatus != null;
	const quietText = item.bannerUrl ? "text-foreground/60 group-hover:text-foreground/80" : "text-muted-foreground";

	return (
		<ContextMenu>
			<ContextMenuTrigger
				className={
					viewAs === "images"
						? cn(
								"group relative block aspect-2/3 cursor-pointer overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10",
								"transition-shadow duration-150",
								"hover:ring-foreground/25 active:scale-[0.99]",
							)
						: cn(
								"group relative flex w-full cursor-pointer gap-3 overflow-hidden rounded-md border bg-card p-2 ring-1 ring-transparent",
								"transition-shadow duration-150 hover:ring-foreground/15",
							)
				}
				onClick={onOpen}>
				{viewAs === "images" ? (
					<>
						<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' className='size-full' lazy />
						<div className='absolute inset-x-0 bottom-0 flex flex-col'>
							{inList ? (
								<div className='bg-black/70 px-2 py-1 text-center text-[10px] font-medium text-white backdrop-blur-[2px]'>
									<span className='block truncate'>{listStatus}</span>
								</div>
							) : null}
							<div className={cn("flex items-center justify-center px-2 py-1.5 text-xs font-medium", bar)}>
								<span className='min-w-0 truncate text-center'>{imageFooterText(item, sortBy)}</span>
							</div>
						</div>
					</>
				) : (
					<>
						{item.bannerUrl ? (
							<>
								<AnimeCover id={item.id} kind='banner' sourceUrl={item.bannerUrl} alt='' className='pointer-events-none absolute inset-0 size-full' lazy />
								<div
									aria-hidden
									className='pointer-events-none absolute inset-0 bg-linear-to-r from-card/45 via-card/78 to-card transition-opacity duration-150 group-hover:opacity-85 motion-reduce:transition-none'
								/>
							</>
						) : null}
						<div className='relative z-10 flex w-28 shrink-0 flex-col gap-1.5'>
							<div className='relative aspect-2/3 w-full overflow-hidden rounded-sm bg-muted'>
								<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' className='size-full' lazy />
							</div>
							{inList ? (
								<span className={cn("block truncate rounded-md border bg-card/90 px-2 py-1 text-center text-xs", quietText)}>{listStatus}</span>
							) : (
								<Button
									type='button'
									size='sm'
									variant='secondary'
									className='w-full'
									disabled={adding}
									onClick={(event) => {
										event.stopPropagation();
										onAdd();
									}}>
									Add to list
								</Button>
							)}
						</div>
						<div className='relative z-10 min-w-0 flex-1 text-left'>
							<div className={cn("mb-2 flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-semibold", bar)}>
								<span className='min-w-0 flex-1 truncate'>{item.title}</span>
							</div>
							<div className='grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs'>
								<span className={quietText}>Aired:</span>
								<span className='truncate'>{formatAiredRange(item)}</span>
								<span className={quietText}>Episodes:</span>
								<span>{item.episodes > 0 ? item.episodes : "Unknown"}</span>
								<span className={quietText}>Genres:</span>
								<span className='truncate'>{item.genres.length > 0 ? item.genres.join(", ") : "?"}</span>
								<span className={quietText}>Producers:</span>
								<span className='truncate'>{item.producers.length > 0 ? item.producers.join(", ") : "?"}</span>
								<span className={quietText}>Score:</span>
								<span>{formatScore(item.averageScore)}</span>
								<span className={quietText}>Popularity:</span>
								<span>{formatPopularity(item.popularity)}</span>
							</div>
							{item.synopsis ? <p className={cn("mt-2 line-clamp-3 text-xs", quietText)}>{item.synopsis}</p> : null}
						</div>
					</>
				)}
			</ContextMenuTrigger>
			<ContextMenuContent className='min-w-56'>
				<AnimeItemCommands
					parts={commandParts}
					mode='discover'
					discover={{
						id: item.id,
						title: item.title,
						episodes: item.episodes,
						trailerId: item.trailerId,
						listStatus,
					}}
					onInformation={onOpen}
				/>
			</ContextMenuContent>
		</ContextMenu>
	);
}
