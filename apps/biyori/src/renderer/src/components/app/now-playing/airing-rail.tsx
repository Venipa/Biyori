import { ScrollArea } from "@/components/ui/scroll-area";
import { IdleColumnHeading } from "@/mainview/components/app/now-playing/column-heading";
import { ContinueWatchingCard } from "@/mainview/components/app/now-playing/continue-card";
import { airingCaption } from "@/mainview/components/app/now-playing/utils";
import type { ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";

export function IdleAiringRail({
	groups,
}: {
	groups: Array<{
		label: string;
		items: ContinueWatchingItem[];
		onActivate: (item: ContinueWatchingItem) => void;
	}>;
}) {
	const visible = groups.filter((group) => group.items.length > 0);
	if (visible.length === 0) {
		return null;
	}
	return (
		<ScrollArea className='h-auto min-w-0 w-full' viewportClassName='overflow-x-auto overflow-y-hidden'>
			<div className='flex w-max items-start'>
				{visible.map((group) => (
					<section key={group.label} className='flex flex-col'>
						<IdleColumnHeading sticky>{group.label}</IdleColumnHeading>
						<ul aria-label={group.label} className='flex snap-x snap-mandatory gap-3 pr-6 pb-1'>
							{group.items.map((item) => (
								<li key={item.animeId} className='w-40 shrink-0 snap-start md:w-50'>
									<ContinueWatchingCard item={item} playNextEnabled={false} description={airingCaption(item)} onActivate={() => group.onActivate(item)} />
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</ScrollArea>
	);
}
