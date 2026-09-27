import { ScrollArea } from "@/components/ui/scroll-area";
import { IdleColumnHeading } from "@/mainview/components/app/now-playing/column-heading";
import { ContinueWatchingCard, ContinueWatchingEmpty } from "@/mainview/components/app/now-playing/continue-card";
import { EarlierWatchingList } from "@/mainview/components/app/now-playing/earlier-list";
import { earlierThanLabel } from "@/mainview/components/app/now-playing/utils";
import type { ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";

export function IdlePosterStrip({
	heading,
	label,
	items,
	earlier,
	earlierDays,
	disabled,
	onActivate,
	onOpen,
	description,
}: {
	heading?: string;
	label: string;
	items: ContinueWatchingItem[];
	earlier?: ContinueWatchingItem[];
	earlierDays: number;
	disabled?: boolean;
	onActivate: (item: ContinueWatchingItem) => void;
	onOpen?: (item: ContinueWatchingItem) => void;
	description?: (item: ContinueWatchingItem) => string;
}) {
	const earlierItems = earlier ?? [];
	return (
		<ScrollArea className='h-auto min-w-0 max-w-full' viewportClassName='overflow-x-auto overflow-y-hidden'>
			{heading ? <IdleColumnHeading sticky>{heading}</IdleColumnHeading> : null}
			<ul aria-label={label} className='flex w-max snap-x snap-mandatory items-start gap-3 pb-1'>
				{items.length === 0 ? (
					<li className='shrink-0 snap-start'>
						<ContinueWatchingEmpty className='h-60 w-40 md:h-75 md:w-50' />
					</li>
				) : (
					items.map((item) => (
						<li key={item.animeId} className='w-40 shrink-0 snap-start md:w-50'>
							<ContinueWatchingCard item={item} disabled={disabled} playNextEnabled description={description?.(item)} onActivate={() => onActivate(item)} />
						</li>
					))
				)}
				{earlierItems.length > 0 && onOpen ? (
					<li className='shrink-0 snap-start'>
						<h2 className='mb-1 text-sm font-semibold'>{earlierThanLabel(earlierDays)}</h2>
						<EarlierWatchingList items={earlierItems} disabled={disabled} onOpen={onOpen} onPlay={onActivate} />
					</li>
				) : null}
			</ul>
		</ScrollArea>
	);
}
