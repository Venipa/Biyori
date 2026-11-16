import { useTranslation } from "@biyori/translations/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { folderDisplayName } from "@/lib/folder-path";
import type { AnilistMediaCard } from "@/lib/schemas/anilist-media-card";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { SearchPeek } from "./search-peek";

const ITEM_HEIGHT = 52;

/** Inline picker: list matches first, then provider search results so folders can be linked to anime not on the list. */
export function ListPicker({
	path,
	excludeIds,
	onPick,
	pending = false,
}: {
	path: string;
	excludeIds: ReadonlySet<number>;
	/** replaces the default folder assignment */
	onPick?: (animeId: number) => void;
	pending?: boolean;
}) {
	const { t } = useTranslation();
	const [filter, setFilter] = useState("");
	const rootRef = useRef<HTMLDivElement>(null);
	const listed = trpc.anime.listed.useQuery();
	const assign = trpc.library.assignFolder.useMutation();
	const needle = filter.trim().toLowerCase();
	const [query, setQuery] = useState("");
	useEffect(() => {
		const timer = setTimeout(() => setQuery(filter.trim()), 400);
		return () => clearTimeout(timer);
	}, [filter]);
	// the clicked search result; kept even if a new filter drops it from the list
	const [peek, setPeek] = useState<AnilistMediaCard | null>(null);
	const search = trpc.anilist.search.useQuery({ q: query, page: 1 }, { enabled: query.length >= 2 });
	const listItems = (listed.data ?? []).filter((item) => !excludeIds.has(item.id) && item.title.toLowerCase().includes(needle));
	const listedIds = new Set((listed.data ?? []).map((item) => item.id));
	const items = [
		...listItems.map((item) => ({ id: item.id, title: item.title, coverUrl: item.coverUrl, folder: item.folder, card: null as AnilistMediaCard | null })),
		...(query.length >= 2 ? (search.data?.items ?? []) : [])
			.filter((item) => !excludeIds.has(item.id) && !listedIds.has(item.id))
			.map((item) => ({ id: item.id, title: item.title, coverUrl: item.coverUrl, folder: "", card: item as AnilistMediaCard | null })),
	];
	const choose = (animeId: number) => {
		setPeek(null);
		if (onPick) {
			onPick(animeId);
			return;
		}
		assign.mutate({ path, animeId });
	};
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
				{listed.isPending || (items.length === 0 && search.isFetching) ? (
					<Skeleton className='h-24 w-full' />
				) : items.length === 0 ? (
					<p className='px-2 py-3 text-sm text-muted-foreground'>{t("library.noListMatch")}</p>
				) : (
					<div className='relative' style={{ height: virtualizer.getTotalSize() }}>
						{virtualizer.getVirtualItems().map((virtualItem) => {
							const item = items[virtualItem.index];
							if (!item) {
								return null;
							}
							const card = item.card;
							const label = (
								<>
									<AnimeCover id={item.id} coverUrl={item.coverUrl} alt='' lazy className='h-10 w-7 shrink-0 overflow-hidden rounded-sm' />
									<span className='min-w-0 flex-1'>
										<span className='block truncate'>{item.title}</span>
										{item.folder ? <span className='block truncate text-xs text-muted-foreground'>{folderDisplayName(item.folder)}</span> : null}
										{card ? (
											<span className='flex items-center gap-1'>
												<Badge variant='secondary'>{t("library.notOnList")}</Badge>
												<InfoIcon aria-hidden className='size-3.5 text-muted-foreground' />
											</span>
										) : null}
									</span>
								</>
							);
							return (
								<div
									key={item.id}
									className='absolute top-0 left-0 flex w-full items-center gap-2 px-1'
									style={{ height: ITEM_HEIGHT, transform: `translateY(${virtualItem.start}px)` }}>
									{card ? (
										<button
											type='button'
											aria-expanded={peek?.id === item.id}
											aria-controls='library-search-peek'
											title={t("library.showDetails")}
											className={cn(
												"-ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 pl-1 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
												peek?.id === item.id && "bg-muted",
											)}
											onClick={() => setPeek(peek?.id === item.id ? null : card)}>
											{label}
										</button>
									) : (
										label
									)}
									<Button type='button' variant='outline' size='xs' disabled={assign.isPending || pending} onClick={() => choose(item.id)}>
										{t("library.assign")}
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</ScrollArea>
			{peek ? <SearchPeek key={peek.id} card={peek} disabled={assign.isPending || pending} onAssign={() => choose(peek.id)} onClose={() => setPeek(null)} /> : null}
		</div>
	);
}
