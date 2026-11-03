import { useTranslation } from "@biyori/translations/react";
import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactElement, useRef, useState } from "react";
import { folderDisplayName } from "@/lib/folder-path";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/mainview/components/ui/popover";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { trpc } from "@/mainview/trpc";

const ITEM_HEIGHT = 52;

/** Local-list picker: only anime already on the user's list can be assigned. */
export function FolderPicker({ path, children }: { path: string; children: ReactElement }) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [filter, setFilter] = useState("");
	const listRef = useRef<HTMLDivElement>(null);
	const listed = trpc.anime.listed.useQuery(undefined, { enabled: open });
	const assign = trpc.library.assignFolder.useMutation({
		onSuccess: () => {
			setOpen(false);
		},
	});
	const needle = filter.trim().toLowerCase();
	const items = (listed.data ?? []).filter((item) => item.title.toLowerCase().includes(needle));
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => listRef.current,
		estimateSize: () => ITEM_HEIGHT,
		overscan: 6,
	});

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				setFilter("");
			}}>
			<PopoverTrigger render={children} />
			<PopoverContent align='start' className='flex w-80 flex-col gap-2 p-2'>
				<Input autoFocus value={filter} placeholder={t("library.filterList")} onChange={(event) => setFilter(event.target.value)} />
				{assign.error ? <p className='text-sm text-destructive'>{assign.error.message}</p> : null}
				<div ref={listRef} className='max-h-72 overflow-y-auto'>
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
									<Button
										variant='ghost'
										key={item.id}
										type='button'
										disabled={assign.isPending}
										className='absolute top-0 left-0 w-full justify-start gap-2 px-2 text-left font-normal'
										style={{ height: ITEM_HEIGHT, transform: `translateY(${virtualItem.start}px)` }}
										onClick={() => {
											assign.mutate({ path, animeId: item.id });
										}}>
										<AnimeCover id={item.id} coverUrl={item.coverUrl} alt='' lazy className='h-10 w-7 shrink-0 overflow-hidden rounded-sm' />
										<span className='min-w-0 flex-1'>
											<span className='block truncate'>{item.title}</span>
											{item.folder ? <span className='block truncate text-xs text-muted-foreground'>{folderDisplayName(item.folder)}</span> : null}
										</span>
									</Button>
								);
							})}
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
