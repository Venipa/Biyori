import { useTranslation } from "@biyori/translations/react";
import { PlayIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, memo, useState } from "react";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { Button } from "@/mainview/components/ui/button";
import { formatTimeAgo } from "@/mainview/lib/format-date";
import { listProgressRatio } from "@/mainview/lib/list-progress";
import { airingLineClass } from "@/mainview/lib/season-view";
import { cn } from "@/mainview/lib/utils";

export const TILE_WIDTH = 136;
// cover 2:3 + airing strip (8) + text (52) + row gap (12)
// py 12 + two 16px title lines + 2 gap + 15 meta
const TEXT_HEIGHT = 61;
export const TILE_ROW_HEIGHT = TILE_WIDTH * 1.5 + 8 + TEXT_HEIGHT + 12;

export type PosterTileRow = {
	id: number;
	title: string;
	coverUrl: string | null;
	airingStatus: string | null;
	episodes: number;
	episodesWatched: number;
	lastAiredEpisode: number | null;
	nextAiringAt: string | null;
	libraryEpisodes?: number[];
	availableEpisode?: number;
};

type PosterTileProps<T extends PosterTileRow> = {
	row: T;
	selected: boolean;
	playing: boolean;
	onOpen: (row: T) => void;
	onMenu: (row: T) => void;
	onHover: (row: T) => void;
	onPlay: (row: T) => void;
};

// handlers are ignored in the comparison: the list passes closures that read the latest state from a ref
function PosterTileImpl<T extends PosterTileRow>({ row, selected, playing, onOpen, onMenu, onHover, onPlay }: PosterTileProps<T>) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);
	// the clamp comes off before growing and goes back on only after the shrink lands, so both directions animate real content
	const [clamped, setClamped] = useState(true);
	const reduceMotion = useReducedMotion();
	function expand(): void {
		setClamped(false);
		setExpanded(true);
	}
	const ratio = row.episodes > 0 ? listProgressRatio(row.episodesWatched, row.episodes) : 0;
	const nextAvailable = !!row.libraryEpisodes?.includes(row.episodesWatched + 1);
	// availableEpisode is the highest library episode; only the one right after progress is playable
	const ready = nextAvailable ? row.episodesWatched + 1 : 0;
	const progress = t("list.tileProgress", { watched: row.episodesWatched, total: row.episodes || "?" });

	function onKeyDown(event: KeyboardEvent): void {
		if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
			event.preventDefault();
			onOpen(row);
		}
	}

	return (
		<div
			role='button'
			tabIndex={0}
			data-state={selected ? "selected" : undefined}
			className={cn(
				"group relative flex h-[273px] w-34 cursor-pointer flex-col overflow-hidden rounded-lg bg-card text-left outline-none ring-1 ring-foreground/10 transition-shadow duration-150 hover:ring-foreground/25 focus-visible:ring-2 focus-visible:ring-ring",
				playing ? "ring-2 ring-primary" : "data-[state=selected]:ring-foreground/40",
			)}
			onClick={() => onOpen(row)}
			onKeyDown={onKeyDown}
			onContextMenu={() => onMenu(row)}
			onMouseEnter={() => {
				onHover(row);
				expand();
			}}
			onMouseLeave={() => setExpanded(false)}
			onFocus={expand}
			onBlur={() => setExpanded(false)}>
			<div className='relative aspect-2/3 w-full bg-muted'>
				<AnimeCover id={row.id} coverUrl={row.coverUrl || undefined} alt='' lazy className='size-full' />
				{row.nextAiringAt ? (
					<span className='absolute top-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm'>
						{t("list.tileNext", { episode: (row.lastAiredEpisode ?? 0) + 1, when: formatTimeAgo(row.nextAiringAt) })}
					</span>
				) : null}
				{ready > 0 ? (
					<Button
						type='button'
						size='icon-xs'
						variant='secondary'
						className='absolute right-1.5 bottom-2.5'
						aria-label={t("list.playNext")}
						onClick={(event) => {
							event.stopPropagation();
							onPlay(row);
						}}>
						<PlayIcon />
					</Button>
				) : null}
				{row.episodes > 0 ? <div aria-hidden className='pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-black/45 to-transparent' /> : null}
				{row.episodes > 0 ? (
					<div aria-hidden className='absolute inset-x-0 bottom-0 h-[3px] bg-black/40'>
						<div className='h-full bg-primary' style={{ width: `${Math.round(ratio * 100)}%` }} />
					</div>
				) : null}
			</div>
			<div className='flex h-2 shrink-0 items-center justify-center bg-card'>
				<span aria-hidden className={cn("h-[3px] w-6 rounded-full", airingLineClass(row.airingStatus ?? ""))} />
			</div>
			{/* anchored to the bottom so a clipped title grows upward over the cover; height "auto" is measured by motion */}
			<motion.div
				initial={false}
				animate={{ height: expanded ? "auto" : TEXT_HEIGHT }}
				transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
				onAnimationComplete={() => {
					if (!expanded) {
						setClamped(true);
					}
				}}
				className='absolute inset-x-0 bottom-0 overflow-hidden bg-card'>
				<div className='flex min-w-0 flex-col gap-0.5 px-2 py-1.5'>
					<span title={row.title} className={cn("min-h-8 text-xs leading-4 font-medium", clamped && "line-clamp-2", nextAvailable && "text-primary")}>
						{row.title}
					</span>
					<span className='truncate text-[11px] text-muted-foreground tabular-nums'>{ready > 0 ? `${progress} · ${t("list.tileReady", { episode: ready })}` : progress}</span>
				</div>
			</motion.div>
		</div>
	);
}

export const AnimeListPosterTile = memo(PosterTileImpl, (a, b) => a.row === b.row && a.selected === b.selected && a.playing === b.playing) as typeof PosterTileImpl;
