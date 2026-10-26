import { useTranslation } from "@biyori/translations/react";
import type { inferRouterOutputs } from "@trpc/server";
import { SearchIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useLayoutEffect } from "react";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { listStatusLabel } from "@/mainview/components/app/anime/list-action";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { animeTypeLabel } from "@/mainview/lib/anime-list-filter";
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

const searchOverlayCardClass = "absolute z-30 origin-top overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-[0_12px_32px_-12px_oklch(0_0_0/0.35)]";

// ease-out, small scale from the anchor edge; exit is quicker than enter
const easeOut = [0.23, 1, 0.32, 1] as const;
const overlayMotion = {
	initial: { opacity: 0, scale: 0.97, y: -4 },
	animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease: easeOut } },
	exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12, ease: easeOut } },
} as const;

export function SearchOverlayCard({ className, children }: { className?: string; children: ReactNode }) {
	const reduce = useReducedMotion();
	return (
		<motion.div
			className={cn(searchOverlayCardClass, className)}
			initial={reduce ? { opacity: 0 } : overlayMotion.initial}
			animate={overlayMotion.animate}
			exit={reduce ? { opacity: 0 } : overlayMotion.exit}>
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
	const { t } = useTranslation();
	useLayoutEffect(() => {
		document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
	}, [activeIndex, listId]);
	return (
		<SearchOverlayCard className={className}>
			<ScrollArea className='h-auto max-h-80 overflow-hidden' viewportClassName='h-auto max-h-80 w-full outline-none focus-visible:ring-0'>
				<div id={listId} role='listbox' aria-label={t("search.suggestions")} className='flex flex-col p-1'>
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
									"flex w-full min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm shadow-none outline-none focus-visible:ring-0",
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
									width={28}
									height={42}
									className='aspect-2/3 w-7 shrink-0 overflow-hidden rounded-sm bg-muted'
								/>
								<span className='flex min-w-0 flex-1 flex-col'>
									<span className='truncate'>{item.title}</span>
									<span className='truncate text-xs text-muted-foreground tabular-nums'>
										{[item.type ? animeTypeLabel(item.type) : null, listStatusLabel(item.status), `${progress.watched}/${progress.total}`].filter(Boolean).join(" · ")}
									</span>
								</span>
							</button>
						);
					})}
					{items.length > 0 ? <div aria-hidden className='-mx-1 my-1 h-px bg-border' /> : null}
					<button
						type='button'
						role='option'
						id={`${listId}-${footerIndex}`}
						aria-selected={activeIndex === footerIndex}
						className={cn(
							"flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground shadow-none outline-none focus-visible:ring-0",
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
						<SearchIcon aria-hidden className='size-3.5 shrink-0' />
						<span className='min-w-0 flex-1 truncate'>{t("search.searchFor", { query: q })}</span>
						<kbd className='shrink-0 rounded border px-1 font-sans text-[10px] text-muted-foreground'>↵</kbd>
					</button>
				</div>
			</ScrollArea>
		</SearchOverlayCard>
	);
}
