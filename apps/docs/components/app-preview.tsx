"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { assetPath } from "@/lib/paths";

const SHOT_MS = 6800;

const APP_SHOTS = [
	{
		src: "/app-1.png",
		title: "Watching",
		alt: "Biyori watching list with progress, airing dates, and scores",
		caption: "Progress, the next air date, and your score for the list you are on.",
	},
	{
		src: "/app-nowplaying-1.png",
		title: "Schedule",
		alt: "Biyori now playing with today's and tomorrow's episode cards",
		caption: "No player yet. Today and tomorrow, then the titles still ahead.",
	},
	{
		src: "/app-nowplaying-2.png",
		title: "Now playing",
		alt: "Biyori now playing on a matched episode, with list progress and synopsis",
		caption: "A matched player opens the episode, list status, and synopsis.",
	},
	{
		src: "/app-seasons.png",
		title: "Seasons",
		alt: "Biyori season browser of titles that have not aired yet",
		caption: "A season that has not aired, filtered by status and popularity.",
	},
	{
		src: "/app-about.png",
		title: "About",
		alt: "Biyori about screen with version, Hana, and the changelog",
		caption: "The build you are on: version, Hana, update channel, and changelog.",
	},
] as const;

type ShotState = {
	index: number;
	paused: boolean;
};

const INITIAL_STATE: ShotState = { index: 0, paused: false };

let state: ShotState = INITIAL_STATE;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) listener();
}

function reducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tick(): void {
	if (state.paused || reducedMotion()) return;
	state = { ...state, index: (state.index + 1) % APP_SHOTS.length };
	emit();
}

function ensureTimer(): void {
	if (timer != null || typeof window === "undefined" || reducedMotion()) return;
	timer = setInterval(tick, SHOT_MS);
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	ensureTimer();
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0 && timer != null) {
			clearInterval(timer);
			timer = undefined;
		}
	};
}

function getState(): ShotState {
	return state;
}

function selectShot(next: number): void {
	const count = APP_SHOTS.length;
	const index = ((next % count) + count) % count;
	if (state.index === index) return;
	state = { ...state, index };
	if (timer != null) {
		clearInterval(timer);
		timer = undefined;
	}
	if (listeners.size > 0) ensureTimer();
	emit();
}

function setPaused(paused: boolean): void {
	if (state.paused === paused) return;
	state = { ...state, paused };
	emit();
}

function useShotState(): ShotState {
	return useSyncExternalStore(subscribe, getState, () => INITIAL_STATE);
}

function subscribeReduced(onStoreChange: () => void): () => void {
	const media = window.matchMedia("(prefers-reduced-motion: reduce)");
	media.addEventListener("change", onStoreChange);
	return () => media.removeEventListener("change", onStoreChange);
}

function useReducedMotion(): boolean {
	return useSyncExternalStore(subscribeReduced, reducedMotion, () => false);
}

function ShotStack({ index, priority, sizes }: { index: number; priority?: boolean; sizes: string }) {
	return APP_SHOTS.map((shot, shotIndex) => {
		const active = shotIndex === index;
		const eager = priority === true && shotIndex === 0;
		return (
			<Image
				key={shot.src}
				src={assetPath(shot.src)}
				alt={active ? shot.alt : ""}
				width={1550}
				height={830}
				sizes={sizes}
				priority={eager}
				loading={eager ? undefined : "lazy"}
				className={cn(
					"absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ease-out motion-reduce:transition-none",
					active ? "opacity-100" : "pointer-events-none opacity-0",
				)}
				aria-hidden={active ? undefined : true}
			/>
		);
	});
}

export function AppShotBackdrop() {
	const { index } = useShotState();

	return (
		<div aria-hidden className='pointer-events-none absolute inset-0 z-0 overflow-hidden'>
			<div className='absolute -bottom-[8%] -left-[10%] w-[85%] max-w-3xl [perspective:1600px] md:-bottom-[6%] md:-left-[4%] md:w-[72%]'>
				<div className='origin-center opacity-10 shadow-2xl shadow-black/30 [transform:rotateX(14deg)_rotateY(22deg)_rotateZ(-3deg)_scale(1.08)] [transform-style:preserve-3d] dark:opacity-40'>
					<div className='relative aspect-[1550/830] overflow-hidden rounded-xl border border-white/10'>
						<ShotStack index={index} priority sizes='(max-width: 768px) 90vw, 720px' />
					</div>
				</div>
			</div>
			<div className='absolute inset-0 bg-gradient-to-r from-fd-background from-30% via-fd-background/75 to-transparent' />
			<div className='absolute inset-0 bg-gradient-to-t from-fd-background via-transparent to-fd-background/80' />
		</div>
	);
}

export function AppShotCarousel() {
	const { index, paused } = useShotState();
	const reduced = useReducedMotion();
	const shot = APP_SHOTS[index] ?? APP_SHOTS[0];
	const dots = useRef<Array<HTMLButtonElement | null>>([]);

	function move(delta: number): void {
		const next = (index + delta + APP_SHOTS.length) % APP_SHOTS.length;
		selectShot(next);
		dots.current[next]?.focus();
	}

	return (
		<figure
			className='overflow-hidden rounded-2xl border bg-fd-card'
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={(event) => {
				if (!event.currentTarget.contains(document.activeElement)) setPaused(false);
			}}
			onFocus={() => setPaused(true)}
			onBlur={(event) => {
				const next = event.relatedTarget;
				if (!(next instanceof Node) || !event.currentTarget.contains(next)) setPaused(false);
			}}>
			<div className='relative aspect-[1550/830]'>
				<ShotStack index={index} sizes='(max-width: 1152px) 100vw, 1152px' />
				<figcaption className='absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-20 pb-4 sm:flex-row sm:items-end sm:justify-between sm:px-5 sm:pt-28 sm:pb-5'>
					<div className='min-w-0'>
						<p className='font-medium tracking-tight text-white'>{shot.title}</p>
						<p className='mt-1 max-w-prose text-sm leading-relaxed text-pretty text-white/80'>{shot.caption}</p>
					</div>
					<div
						className='flex shrink-0 items-center gap-1'
						role='group'
						aria-label='App screens'
						onKeyDown={(event) => {
							if (event.key === "ArrowRight") {
								event.preventDefault();
								move(1);
							} else if (event.key === "ArrowLeft") {
								event.preventDefault();
								move(-1);
							}
						}}>
						{APP_SHOTS.map((item, shotIndex) => {
							const selected = shotIndex === index;
							return (
								<button
									key={item.src}
									ref={(node) => {
										dots.current[shotIndex] = node;
									}}
									type='button'
									className='group grid size-8 cursor-pointer place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80'
									aria-label={item.title}
									aria-current={selected ? "true" : undefined}
									onClick={() => selectShot(shotIndex)}>
									<span
										className={cn("h-1 rounded-full transition-[width,background-color] duration-300", selected ? "w-4 bg-fd-primary" : "w-1.5 bg-white/55 group-hover:w-2.5")}
									/>
								</button>
							);
						})}
						{reduced ? null : (
							<button
								type='button'
								className='grid size-8 place-items-center rounded-full text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80'
								aria-label={paused ? "Play screenshots" : "Pause screenshots"}
								aria-pressed={paused}
								onClick={() => setPaused(!paused)}>
								{paused ? <PlayIcon className='size-3.5' /> : <PauseIcon className='size-3.5' />}
							</button>
						)}
					</div>
				</figcaption>
			</div>
		</figure>
	);
}
