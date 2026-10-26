import { useTranslation } from "@biyori/translations/react";
import { PlusIcon } from "lucide-react";
import { memo } from "react";
import type { SeasonItem, SeasonSortBy, SeasonViewAs } from "@/lib/schemas/seasons";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { listStatusLabel } from "@/mainview/components/app/anime/list-action";
import { AnimeItemCommands } from "@/mainview/components/app/anime-info/item-commands";
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
import { genreLabel } from "@/mainview/lib/anime-list-filter";
import { airingLineClass, airStamp, formatCommunityScore, imageFooterText } from "@/mainview/lib/season-view";
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

function startLabel(item: SeasonItem): string | null {
	const stamp = airStamp(item.startDate);
	return stamp ? `${stamp.month} ${stamp.day}` : null;
}

type SeasonCardProps = {
	item: SeasonItem;
	viewAs: SeasonViewAs;
	sortBy: SeasonSortBy;
	listStatus: ListStatus | null;
	onOpen: () => void;
	onAdd: () => void;
	adding: boolean;
};

// onOpen/onAdd are ignored: the grid passes closures that read the latest handlers from a ref
export const SeasonCard = memo(
	SeasonCardImpl,
	(a, b) => a.item === b.item && a.viewAs === b.viewAs && a.sortBy === b.sortBy && a.listStatus === b.listStatus && a.adding === b.adding,
);

function SeasonCardImpl(props: SeasonCardProps) {
	const { item, viewAs, sortBy, listStatus, onOpen, onAdd, adding } = props;
	const { t } = useTranslation();
	const airing = airingLineClass(item.status);
	const inList = listStatus != null;

	const meta = [
		startLabel(item),
		item.format || null,
		item.episodes > 0 ? t("seasons.epsShort", { count: item.episodes }) : null,
		item.averageScore > 0 ? formatCommunityScore(item.averageScore) : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<ContextMenu>
			<ContextMenuTrigger
				className={
					viewAs === "images"
						? "group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 transition-shadow duration-150 hover:ring-foreground/25"
						: "group relative flex h-[170px] w-full cursor-pointer gap-3 overflow-hidden rounded-lg border bg-card p-3 text-left transition-colors duration-150 hover:bg-muted/40"
				}
				onClick={onOpen}>
				{viewAs === "images" ? (
					<>
						<div className='relative aspect-2/3 w-full'>
							<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' className='size-full' lazy />
							{inList ? (
								<span className='absolute top-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm'>
									{listStatusLabel(listStatus)}
								</span>
							) : null}
						</div>
						<div className='flex h-2 shrink-0 items-center justify-center bg-card'>
							<span aria-hidden className={cn("h-[3px] w-6 rounded-full", airing)} />
						</div>
						<div className='flex h-[52px] min-w-0 flex-col gap-0.5 bg-card px-2 py-1.5 text-left'>
							<span className='line-clamp-2 min-h-8 text-xs leading-4 font-medium'>{item.title}</span>
							<span className='truncate text-[11px] text-muted-foreground tabular-nums'>{imageFooterText(item, sortBy)}</span>
						</div>
					</>
				) : (
					<>
						{item.bannerUrl ? (
							<>
								<AnimeCover id={item.id} kind='banner' sourceUrl={item.bannerUrl} alt='' className='pointer-events-none absolute inset-0 size-full' lazy />
								<div
									aria-hidden
									className='pointer-events-none absolute inset-0 bg-linear-to-r from-card/85 via-card/92 to-card/95 transition-opacity duration-150 group-hover:opacity-90 motion-reduce:transition-none'
								/>
							</>
						) : null}
						<div className='relative z-10 aspect-2/3 w-24 shrink-0 self-start overflow-hidden rounded-md bg-muted'>
							<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' className='size-full' lazy />
							<div className='absolute inset-x-0 bottom-1.5 flex justify-center px-1'>
								{inList ? (
									<span className='max-w-full truncate rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm'>
										{listStatusLabel(listStatus)}
									</span>
								) : (
									// hover-only so posters stay clean; not clickable while hidden
									<button
										type='button'
										disabled={adding}
										className='pointer-events-none flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-black/75 focus-visible:pointer-events-auto focus-visible:opacity-100 disabled:opacity-50 motion-reduce:transition-none'
										onClick={(event) => {
											event.stopPropagation();
											onAdd();
										}}>
										<PlusIcon className='size-3' />
										{t("seasons.addToList")}
									</button>
								)}
							</div>
						</div>
						<span aria-hidden className={cn("relative z-10 h-36 w-[3px] shrink-0 self-start rounded-full", airing)} />
						<div className='relative z-10 flex h-full min-w-0 flex-1 flex-col gap-1.5'>
							<span className='line-clamp-2 shrink-0 text-sm font-semibold' title={item.title}>
								{item.title}
							</span>
							<span className='shrink-0 truncate text-xs text-muted-foreground tabular-nums'>{meta}</span>
							{item.genres.length > 0 ? (
								<span className='flex shrink-0 gap-1 overflow-hidden'>
									{item.genres.slice(0, 4).map((genre) => (
										<span key={genre} className='shrink-0 rounded-full bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground'>
											{genreLabel(genre)}
										</span>
									))}
								</span>
							) : null}
							{/* fills what's left and fades out instead of cutting mid-line */}
							{item.synopsis ? (
								<p className='min-h-0 flex-1 overflow-hidden text-xs text-muted-foreground mask-[linear-gradient(to_bottom,black_65%,transparent)]'>{item.synopsis}</p>
							) : null}
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
