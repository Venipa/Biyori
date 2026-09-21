import type { inferRouterOutputs } from "@trpc/server";
import { motion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useLayoutEffect } from "react";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { Badge } from "@/mainview/components/ui/badge";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { listProgressLabel } from "@/mainview/lib/list-progress";
import { cn } from "@/mainview/lib/utils";
import type { AppRouter } from "@/shared/app-router";

export type TitleSuggestion = inferRouterOutputs<AppRouter>["anime"]["suggest"][number];

export function suggestionOptionCount(items: readonly TitleSuggestion[]): number {
	return items.length + 1;
}

export function handleSuggestKeyDown(input: {
	event: KeyboardEvent<HTMLInputElement>;
	open: boolean;
	optionCount: number;
	activeIndex: number;
	onActiveIndex: (index: number) => void;
	onDismiss: () => void;
	onChoose: (index: number) => void;
}): void {
	if (!input.open) {
		return;
	}
	const { event } = input;
	if (event.key === "ArrowDown") {
		event.preventDefault();
		const next = input.activeIndex >= input.optionCount - 1 ? 0 : input.activeIndex + 1;
		input.onActiveIndex(next);
		return;
	}
	if (event.key === "ArrowUp") {
		event.preventDefault();
		const next = input.activeIndex <= 0 ? input.optionCount - 1 : input.activeIndex - 1;
		input.onActiveIndex(next);
		return;
	}
	if (event.key === "Escape") {
		event.preventDefault();
		input.onDismiss();
		return;
	}
	if (event.key === "Enter") {
		event.preventDefault();
		input.onChoose(input.activeIndex);
	}
}

const searchOverlayCardClass =
	"absolute z-30 overflow-hidden rounded-br-lg border-r border-b border-border bg-popover text-popover-foreground shadow-[4px_8px_24px_-12px_oklch(0_0_0/0.35)]";

const overlayMotion = {
	initial: { opacity: 0, x: -8 },
	animate: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: -8 },
} as const;

const overlayTransition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] } as const;

export function SearchOverlayCard({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<motion.div
			className={cn(searchOverlayCardClass, className)}
			initial={overlayMotion.initial}
			animate={overlayMotion.animate}
			exit={overlayMotion.exit}
			transition={overlayTransition}>
			{children}
		</motion.div>
	);
}

export function SearchSuggestPanel({
	listId,
	q,
	items,
	activeIndex,
	onActiveIndex,
	onOpen,
	onSearchAnilist,
	className,
}: {
	listId: string;
	q: string;
	items: readonly TitleSuggestion[];
	activeIndex: number;
	onActiveIndex: (index: number) => void;
	onOpen: (id: number) => void;
	onSearchAnilist: () => void;
	className?: string;
}) {
	const footerIndex = items.length;
	useLayoutEffect(() => {
		document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
	}, [activeIndex, listId]);
	return (
		<SearchOverlayCard className={className}>
			<ScrollArea className='h-auto max-h-80 overflow-hidden' viewportClassName='h-auto max-h-80 w-full outline-none focus-visible:ring-0'>
				<div id={listId} role='listbox' aria-label='Title suggestions' className='py-1'>
					{items.map((item, index) => {
						const progress = listProgressLabel(item.episodesWatched, item.episodes);
						const optionId = `${listId}-${index}`;
						const active = index === activeIndex;
						return (
							<button
								key={item.id}
								type='button'
								role='option'
								id={optionId}
								aria-selected={active}
								className={cn(
									"flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left text-sm shadow-none outline-none focus-visible:ring-0",
									active ? "bg-muted" : "hover:bg-muted/60",
								)}
								onMouseDown={(event) => {
									event.preventDefault();
								}}
								onMouseEnter={() => {
									onActiveIndex(index);
								}}
								onClick={() => {
									onOpen(item.id);
								}}>
								<AnimeCover
									id={item.id}
									coverUrl={item.coverUrl || undefined}
									alt=''
									lazy
									width={32}
									height={48}
									className='aspect-2/3 w-8 shrink-0 overflow-hidden rounded-sm bg-muted'
								/>
								<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
									<span className='truncate font-medium'>{item.title}</span>
									<span className='flex min-w-0 flex-wrap items-center gap-1'>
										{item.type ? (
											<Badge variant='outline' size='xs'>
												{item.type}
											</Badge>
										) : null}
										<Badge variant='secondary' size='xs'>
											{item.status}
										</Badge>
										<span className='text-xs tabular-nums text-muted-foreground'>
											{progress.watched}/{progress.total}
										</span>
									</span>
								</span>
								<span className='shrink-0 text-xs tabular-nums text-muted-foreground'>{Math.round(item.score * 100)}%</span>
							</button>
						);
					})}
					<button
						type='button'
						role='option'
						id={`${listId}-${footerIndex}`}
						aria-selected={activeIndex === footerIndex}
						className={cn(
							"flex w-full min-w-0 px-2 py-1.5 text-left text-sm shadow-none outline-none focus-visible:ring-0",
							activeIndex === footerIndex ? "bg-muted" : "hover:bg-muted/60",
						)}
						onMouseDown={(event) => {
							event.preventDefault();
						}}
						onMouseEnter={() => {
							onActiveIndex(footerIndex);
						}}
						onClick={() => {
							onSearchAnilist();
						}}>
						<span className='truncate'>Search AniList for "{q}"</span>
					</button>
				</div>
			</ScrollArea>
		</SearchOverlayCard>
	);
}
