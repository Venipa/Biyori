import { useTranslation } from "@biyori/translations/react";
import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { folderDisplayName } from "@/lib/folder-path";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { trpc } from "@/mainview/trpc";

const ITEM_HEIGHT = 52;

/** Inline local-list picker: only anime already on the user's list can be assigned to a folder. */
export function ListPicker({ path, excludeIds }: { path: string; excludeIds: ReadonlySet<number> }) {
	const { t } = useTranslation();
	const [filter, setFilter] = useState("");
	const rootRef = useRef<HTMLDivElement>(null);
	const listed = trpc.anime.listed.useQuery();
	const assign = trpc.library.assignFolder.useMutation();
	const needle = filter.trim().toLowerCase();
	const items = (listed.data ?? []).filter((item) => !excludeIds.has(item.id) && item.title.toLowerCase().includes(needle));
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => rootRef.current?.querySelector("[data-slot=scroll-area-viewport]") ?? null,
		estimateSize: () => ITEM_HEIGHT,
		overscan: 6,
		// the drawer is portaled and animated; keep a sane window until the viewport reports its size
		initialRect: { width: 360, height: 320 },
	});

	return (
		<div ref={rootRef} className='flex min-h-0 flex-1 flex-col gap-2'>
			<Input value={filter} placeholder={t("library.filterList")} onChange={(event) => setFilter(event.target.value)} />
			{assign.error ? <p className='text-sm text-destructive'>{assign.error.message}</p> : null}
			<ScrollArea className='min-h-0 flex-1'>
				{listed.isPending ? (
					<Skeleton className='h-24 w-full' />
				) : items.length === 0 ? (
					<p className='px-2 py-3 text-sm text-muted-foreground'>
						{t("library.noListMatch")}{" "}
						<Link to='/app/search' className='underline underline-offset-2'>
							{t("library.searchLink")}
						</Link>
					</p>
				) : (
					<div className='relative' style={{ height: virtualizer.getTotalSize() }}>
						{virtualizer.getVirtualItems().map((virtualItem) => {
							const item = items[virtualItem.index];
							if (!item) {
								return null;
							}
							return (
								<div
									key={item.id}
									className='absolute top-0 left-0 flex w-full items-center gap-2 px-1'
									style={{ height: ITEM_HEIGHT, transform: `translateY(${virtualItem.start}px)` }}>
									<AnimeCover id={item.id} coverUrl={item.coverUrl} alt='' lazy className='h-10 w-7 shrink-0 overflow-hidden rounded-sm' />
									<span className='min-w-0 flex-1'>
										<span className='block truncate'>{item.title}</span>
										{item.folder ? <span className='block truncate text-xs text-muted-foreground'>{folderDisplayName(item.folder)}</span> : null}
									</span>
									<Button
										type='button'
										variant='outline'
										size='xs'
										disabled={assign.isPending}
										onClick={() => {
											assign.mutate({ path, animeId: item.id });
										}}>
										{t("library.assign")}
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
