import { PlayIcon } from "lucide-react";
import { ScrollBlur } from "@/components/ui/scroll-blur";
import { IdleItemContextMenu } from "@/mainview/components/app/now-playing/item-menu";
import { episodeLine } from "@/mainview/components/app/now-playing/utils";
import { Button } from "@/mainview/components/ui/button";
import type { ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";

export function EarlierWatchingList({
	items,
	disabled,
	onOpen,
	onPlay,
}: {
	items: ContinueWatchingItem[];
	disabled?: boolean;
	onOpen: (item: ContinueWatchingItem) => void;
	onPlay: (item: ContinueWatchingItem) => void;
}) {
	return (
		<ScrollBlur axis='vertical' className='h-60 w-40 md:h-75 md:w-50'>
			<ul aria-label='Earlier' className='flex flex-col gap-0.5'>
				{items.map((item) => (
					<li key={item.animeId}>
						<IdleItemContextMenu
							item={item}
							playNextEnabled={!disabled}
							render={
								<div className='flex h-10 items-center gap-1 pr-0.5 pl-1'>
									<button type='button' className='flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 text-left' onClick={() => onOpen(item)}>
										<span className='truncate text-xs leading-none'>{item.title}</span>
										<span className='truncate text-xs leading-none text-muted-foreground'>{episodeLine(item)}</span>
									</button>
									<Button
										type='button'
										variant='ghost'
										size='icon-sm'
										className='[&_svg]:size-3'
										disabled={disabled}
										aria-label={`Play ${item.title}`}
										onClick={() => onPlay(item)}>
										<PlayIcon />
									</Button>
								</div>
							}
						/>
					</li>
				))}
			</ul>
		</ScrollBlur>
	);
}
