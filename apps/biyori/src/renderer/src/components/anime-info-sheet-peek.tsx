import { motion, useReducedMotion } from "motion/react";
import { AnimeCover } from "@/mainview/components/anime-cover";
import type { AnimeInfoFrame } from "@/mainview/lib/anime-info-stack";

const EASE = [0.22, 1, 0.36, 1] as const;

const DEPTH = [
	{ x: -56, scale: 0.98 },
	{ x: -28, scale: 0.99 },
] as const;

const FROM_RIGHT = { x: 48, opacity: 0, scale: 1 } as const;

type AnimeInfoSheetPeekProps = {
	frame: AnimeInfoFrame;
	depth: 0 | 1;
};

export function AnimeInfoSheetPeek({ frame, depth }: AnimeInfoSheetPeekProps) {
	const reduce = useReducedMotion();
	const pose = reduce ? { x: 0, opacity: 1, scale: 1 } : { ...DEPTH[depth], opacity: 1 };
	const off = reduce ? { x: 0, opacity: 0, scale: 1 } : FROM_RIGHT;
	const title = frame.title?.trim() || `Anime ${frame.id}`;
	return (
		<motion.div
			aria-hidden
			className='pointer-events-none absolute inset-0 origin-bottom-left overflow-hidden rounded-xl rounded-b-none bg-popover ring-1 ring-foreground/10'
			style={{ zIndex: depth + 1 }}
			originX={0}
			originY={1}
			initial={off}
			animate={pose}
			exit={{ ...off, transition: { duration: reduce ? 0 : 0.15, ease: EASE } }}
			transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}>
			<div className='relative h-40 w-full bg-muted'>
				<AnimeCover id={frame.id} coverUrl={frame.coverUrl || undefined} alt='' className='size-full' />
				<div className='pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-popover to-transparent' />
			</div>
			<p className='truncate px-4 py-3 text-sm font-medium'>{title}</p>
		</motion.div>
	);
}
