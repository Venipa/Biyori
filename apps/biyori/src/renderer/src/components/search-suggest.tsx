import { AnimeCover } from "@/mainview/components/anime-cover";
import { Badge } from "@/mainview/components/ui/badge";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { listProgressLabel } from "@/mainview/lib/list-progress";
import { cn } from "@/mainview/lib/utils";
import type { AppRouter } from "@/shared/app-router";
import type { inferRouterOutputs } from "@trpc/server";
import type { KeyboardEvent } from "react";

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
		input.onActiveIndex(Math.min(input.activeIndex + 1, input.optionCount - 1));
		return;
	}
	if (event.key === "ArrowUp") {
		event.preventDefault();
		input.onActiveIndex(Math.max(input.activeIndex - 1, 0));
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

export function SearchSuggestPanel({
	listId,
	q,
	items,
	activeIndex,
	onActiveIndex,
	onOpen,
	onSearchAnilist,
}: {
	listId: string;
	q: string;
	items: readonly TitleSuggestion[];
	activeIndex: number;
	onActiveIndex: (index: number) => void;
	onOpen: (id: number) => void;
	onSearchAnilist: () => void;
}) {
	const footerIndex = items.length;
	return (
		<div className='absolute top-full right-0 left-0 z-50 bg-popover text-popover-foreground'>
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
		</div>
	);
}
