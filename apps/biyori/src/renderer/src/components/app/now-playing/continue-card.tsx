import { PlayCircleIcon, PlayIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { IdleItemContextMenu } from "@/mainview/components/app/now-playing/item-menu";
import { lastPlayedArt } from "@/mainview/components/app/now-playing/utils";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Card } from "@/mainview/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/mainview/components/ui/empty";
import type { ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";

export function ContinueWatchingEmpty({ className, description }: { className?: string; description?: string }) {
	const art = trpc.history.latest.useQuery(undefined, { select: lastPlayedArt }).data ?? null;
	return (
		<Empty className={cn("relative justify-center overflow-hidden border p-3", className)}>
			{art != null ? (
				<AnimeCover
					id={art.id}
					kind={art.kind}
					sourceUrl={art.kind === "banner" ? art.url : undefined}
					coverUrl={art.url}
					alt=''
					className='pointer-events-none absolute inset-0 size-full opacity-10 grayscale scale-110 object-center object-cover'
				/>
			) : null}
			<EmptyHeader className='relative z-10 max-w-none gap-2'>
				<EmptyMedia variant='icon'>
					<PlayCircleIcon />
				</EmptyMedia>
				<EmptyDescription className='text-xs/snug'>Waiting for new anime episodes.</EmptyDescription>
				{description != null ? <EmptyDescription>{description}</EmptyDescription> : null}
			</EmptyHeader>
		</Empty>
	);
}

const playCardSwap = { duration: 0.16, ease: [0.16, 1, 0.3, 1] } as const;

export function PlayCardDetail({ caption, playLabel, showPlay }: { caption: string; playLabel: string; showPlay: boolean }) {
	const reduceMotion = useReducedMotion();
	const transition = reduceMotion ? { duration: 0 } : playCardSwap;
	return (
		<span className='relative mt-0.5 block overflow-hidden'>
			<AnimatePresence mode='popLayout' initial={false}>
				{showPlay ? (
					<motion.span
						key='play'
						className='flex items-center gap-1 text-xs font-medium leading-snug text-white'
						initial={reduceMotion ? false : { opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={transition}>
						<PlayIcon className='size-3 shrink-0' />
						{playLabel}
					</motion.span>
				) : (
					<motion.span
						key='caption'
						className='block text-xs leading-snug wrap-break-word text-white/80'
						initial={reduceMotion ? false : { opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={transition}>
						{caption}
					</motion.span>
				)}
			</AnimatePresence>
		</span>
	);
}

export function ContinueWatchingCard({
	item,
	disabled,
	playNextEnabled = false,
	description,
	onActivate,
}: {
	item: ContinueWatchingItem;
	disabled?: boolean;
	playNextEnabled?: boolean;
	description?: string;
	onActivate: () => void;
}) {
	const [hovered, setHovered] = useState(false);
	const reduceMotion = useReducedMotion();
	const playsEpisode = playNextEnabled && !disabled;
	const showPlay = playsEpisode && hovered;
	const total = item.episodes != null && item.episodes > 0 ? item.episodes : null;
	const caption = description ?? `Next episode ${item.nextEpisode}${total != null ? ` of ${total}` : ""}`;
	const playLabel = `Play episode ${item.nextEpisode}`;
	function setPlayHover(next: boolean): void {
		if (playsEpisode) {
			setHovered(next);
		}
	}
	return (
		<IdleItemContextMenu
			item={item}
			playNextEnabled={playsEpisode}
			render={
				<Button
					type='button'
					variant='ghost'
					className='h-auto w-full min-w-0 rounded-xl p-0 text-left font-normal whitespace-normal hover:bg-transparent dark:hover:bg-transparent'
					disabled={disabled}
					aria-label={playsEpisode ? `Play ${item.title}, episode ${item.nextEpisode}` : undefined}
					onMouseEnter={() => {
						setPlayHover(true);
					}}
					onMouseLeave={() => {
						setPlayHover(false);
					}}
					onFocus={() => {
						setPlayHover(true);
					}}
					onBlur={() => {
						setPlayHover(false);
					}}
					onClick={onActivate}>
					<Card size='sm' className='isolate w-full overflow-clip py-0'>
						<span className='relative block aspect-square h-60 w-full overflow-clip rounded-xl bg-muted transform-gpu [-webkit-mask-image:-webkit-radial-gradient(#fff,#000)] md:h-75'>
							<AnimeCover
								id={item.animeId}
								kind='cover'
								coverUrl={item.coverUrl}
								alt=''
								lazy
								className='size-full [&_img]:block [&_img]:rounded-xl [&_img]:transform-gpu [&_img]:[clip-path:inset(0_round_var(--radius-xl))] [&_img]:[filter:none] [&_img]:transition-none'
							/>
							<motion.span
								aria-hidden
								className='pointer-events-none absolute inset-0 bg-black/40'
								initial={false}
								animate={{ opacity: showPlay ? 1 : 0 }}
								transition={reduceMotion ? { duration: 0 } : playCardSwap}
							/>
							<span className='pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/55 to-transparent p-2 pt-8'>
								<span className='block text-sm font-medium leading-snug wrap-break-word text-white'>{item.title}</span>
								<PlayCardDetail caption={caption} playLabel={playLabel} showPlay={showPlay} />
							</span>
							{item.type ? (
								<Badge variant='outline' className='absolute top-2 left-2 border-white/30 bg-black/50 text-white'>
									{item.type}
								</Badge>
							) : null}
						</span>
					</Card>
				</Button>
			}
		/>
	);
}
