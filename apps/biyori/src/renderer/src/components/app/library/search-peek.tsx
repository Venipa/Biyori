import { useTranslation } from "@biyori/translations/react";
import { XIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { AnilistMediaCard } from "@/lib/schemas/anilist-media-card";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { AnimeSeriesInfo } from "@/mainview/components/app/anime-info/series-info";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { animeTypeLabel } from "@/mainview/lib/anime-list-filter";
import { formatSeasonLabel } from "@/mainview/lib/season-view";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Details for a search result, pinned to the left edge of the folder sheet so the sheet reads as extended. */
export function SearchPeek({ card, disabled, onAssign, onClose }: { card: AnilistMediaCard; disabled: boolean; onAssign: () => void; onClose: () => void }) {
	const { t } = useTranslation();
	const reduce = useReducedMotion();
	const season = formatSeasonLabel(card.season, card.seasonYear);
	const meta = [card.format ? animeTypeLabel(card.format) : null, season || null].filter(Boolean).join(" · ");
	return (
		<motion.aside
			id='library-search-peek'
			data-slot='folder-peek'
			aria-label={card.title}
			className='absolute top-0 right-full bottom-0 flex w-72 max-w-[calc(100vw-30rem)] flex-col overflow-hidden rounded-l-xl border-r bg-popover text-sm ring-1 ring-foreground/10'
			initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}>
			<div className='flex gap-3 p-4 pr-10'>
				<AnimeCover id={card.id} coverUrl={card.coverUrl} alt='' className='h-28 w-20 shrink-0 overflow-hidden rounded-md' />
				<div className='flex min-w-0 flex-col gap-1'>
					<p className='font-medium leading-snug select-text'>{card.title}</p>
					{meta ? <p className='text-xs text-muted-foreground'>{meta}</p> : null}
					<Badge variant='secondary'>{t("library.notOnList")}</Badge>
				</div>
			</div>
			<Button type='button' variant='ghost' size='icon-sm' className='absolute top-2 right-2' aria-label={t("library.closeDetails")} onClick={onClose}>
				<XIcon />
			</Button>
			<ScrollArea className='min-h-0 flex-1' viewportClassName='px-4 pb-4'>
				<AnimeSeriesInfo
					compact
					anime={{
						title: card.title,
						titles: { ...card.titles, synonyms: [] },
						type: card.format,
						episodes: card.episodes,
						airingStatus: card.status,
						season,
						genres: card.genres,
						tags: card.tags,
						producers: card.producers,
						averageScore: card.averageScore,
						synopsis: card.synopsis,
					}}
				/>
			</ScrollArea>
			<div className='border-t p-3'>
				<Button type='button' className='w-full' disabled={disabled} onClick={onAssign}>
					{t("library.assign")}
				</Button>
			</div>
		</motion.aside>
	);
}
