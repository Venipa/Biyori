import { ChevronLeftIcon } from "lucide-react";
import { relatedHistoryLabel } from "@/lib/schemas/related-media";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { Button } from "@/mainview/components/ui/button";
import type { AnimeInfoFrame } from "@/mainview/lib/anime-info-stack";

export function AnimeInfoBackHistory({ history, onBackTo }: { history: AnimeInfoFrame[]; onBackTo: (index: number) => void }) {
	if (history.length === 0) {
		return null;
	}
	return (
		<div className='group/back absolute top-2 left-2 z-30 flex max-w-56 flex-col items-stretch'>
			<Button type='button' variant='secondary' size='icon-sm' aria-label='Back' onClick={() => onBackTo(history.length - 1)}>
				<ChevronLeftIcon />
			</Button>
			<div className='grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within/back:grid-rows-[1fr] group-hover/back:grid-rows-[1fr] motion-reduce:transition-none'>
				<div className='min-h-0 overflow-hidden'>
					<ul className='mt-1 flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-md border bg-popover/95 p-1 shadow-md'>
						{[...history].reverse().map((frame, offset) => {
							const index = history.length - 1 - offset;
							const relation = relatedHistoryLabel(frame.viaRelation, frame.season);
							const title = frame.title?.trim() || `Anime ${frame.id}`;
							return (
								<li key={`${frame.id}-${index}`}>
									<button type='button' className='flex w-full items-center gap-2 rounded-sm px-1 py-1 text-left hover:bg-muted' onClick={() => onBackTo(index)}>
										<span className='relative size-8 shrink-0 overflow-hidden rounded-sm bg-muted'>
											<AnimeCover id={frame.id} coverUrl={frame.coverUrl || undefined} alt='' className='size-full' />
										</span>
										<span className='min-w-0 flex-1'>
											<span className='block truncate text-xs font-medium'>{title}</span>
											{relation ? <span className='block truncate text-[10px] text-muted-foreground'>{relation}</span> : null}
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				</div>
			</div>
		</div>
	);
}
