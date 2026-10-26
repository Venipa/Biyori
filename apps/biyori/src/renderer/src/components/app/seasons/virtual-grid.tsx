import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SeasonItem, SeasonSortBy, SeasonViewAs } from "@/lib/schemas/seasons";
import { SeasonCard } from "@/mainview/components/app/seasons/card";
import { SeasonDisplay, seasonGridClass } from "@/mainview/components/app/seasons/display";
import { isAltView } from "@/mainview/components/app/seasons/grid-skeleton";
import { flattenSeasonVirtualItems, SEASON_CARD_WIDTH, SEASON_HEADER_HEIGHT, SEASON_ROW_HEIGHT, type SeasonGroup, seasonGridColumns } from "@/mainview/lib/season-view";
import type { ListStatus } from "@/shared/list";

export function stickyHeaderIndex(indexes: number[], startIndex: number): number {
	let active = indexes[0] ?? 0;
	for (const index of indexes) {
		if (index <= startIndex) {
			active = index;
		}
	}
	return active;
}

export function SeasonVirtualGrid({
	groups,
	viewAs,
	sortBy,
	localById,
	onOpen,
	onAdd,
	adding,
}: {
	groups: SeasonGroup[];
	viewAs: SeasonViewAs;
	sortBy: SeasonSortBy;
	localById: Map<number, ListStatus>;
	onOpen: (item: SeasonItem) => void;
	onAdd: (item: SeasonItem) => void;
	adding: boolean;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const activeStickyRef = useRef(0);
	const [width, setWidth] = useState(0);
	const viewAsRef = useRef(viewAs);
	viewAsRef.current = viewAs;
	useEffect(() => {
		const node = rootRef.current;
		if (!node) {
			return;
		}
		// only re-render when the column count changes, not on every resized pixel
		const update = (next: number) => {
			setWidth((prev) => (prev && seasonGridColumns(viewAsRef.current, prev) === seasonGridColumns(viewAsRef.current, next) ? prev : next));
		};
		const observer = new ResizeObserver((entries) => {
			update(entries[0]?.contentRect.width ?? 0);
		});
		observer.observe(node);
		update(node.clientWidth);
		return () => {
			observer.disconnect();
		};
	}, []);
	const columns = seasonGridColumns(viewAs, width || 640);
	const handlers = useRef({ onOpen, onAdd });
	handlers.current = { onOpen, onAdd };
	const stable = useMemo(() => ({ open: (item: SeasonItem) => handlers.current.onOpen(item), add: (item: SeasonItem) => handlers.current.onAdd(item) }), []);
	const items = flattenSeasonVirtualItems(groups, columns);
	const stickyIndexes = items.flatMap((item, index) => (item.type === "header" ? [index] : []));
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => rootRef.current?.closest("[data-slot=scroll-area-viewport]") ?? null,
		// every row has a fixed height, so positions are exact and nothing is measured (fast scrolls can't overlap)
		estimateSize: (index) => (items[index]?.type === "header" ? SEASON_HEADER_HEIGHT : SEASON_ROW_HEIGHT[viewAs]),
		overscan: 2,
		getItemKey: (index) => items[index]?.key ?? index,
		rangeExtractor: (range) => {
			const active = stickyHeaderIndex(stickyIndexes, range.startIndex);
			activeStickyRef.current = active;
			const next = new Set([active, ...defaultRangeExtractor(range)]);
			return [...next].sort((a, b) => a - b);
		},
	});
	const virtualItems = virtualizer.getVirtualItems();
	const activeSticky = activeStickyRef.current;
	return (
		<div ref={rootRef} className='relative w-full' style={{ height: virtualizer.getTotalSize() }}>
			{virtualItems.map((virtualRow) => {
				const item = items[virtualRow.index];
				if (!item) {
					return null;
				}
				const isStuck = item.type === "header" && virtualRow.index === activeSticky;
				return (
					<div
						key={item.key}
						data-index={virtualRow.index}
						className={isStuck ? "sticky top-0 z-10 w-full overflow-hidden" : "absolute top-0 left-0 w-full overflow-hidden"}
						style={isStuck ? { height: virtualRow.size } : { height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}>
						{item.type === "header" ? (
							<h2 className='flex h-full items-center border-b bg-muted px-4 text-sm font-medium'>
								{item.label}
								<span className='ml-2 text-muted-foreground'>({item.count})</span>
							</h2>
						) : (
							<ul
								className={seasonGridClass(viewAs)}
								style={{
									gridTemplateColumns: viewAs === "images" || viewAs === "tiles" ? `repeat(${columns}, ${SEASON_CARD_WIDTH[viewAs]}px)` : `repeat(${columns}, minmax(0, 1fr))`,
								}}>
								{item.items.map((card) => (
									<li key={card.id}>
										{isAltView(viewAs) ? (
											<SeasonDisplay
												item={card}
												viewAs={viewAs}
												listStatus={localById.get(card.id) ?? null}
												onOpen={() => stable.open(card)}
												onAdd={() => stable.add(card)}
												adding={adding}
											/>
										) : (
											<SeasonCard
												item={card}
												viewAs={viewAs}
												sortBy={sortBy}
												listStatus={localById.get(card.id) ?? null}
												onOpen={() => stable.open(card)}
												onAdd={() => stable.add(card)}
												adding={adding}
											/>
										)}
									</li>
								))}
							</ul>
						)}
					</div>
				);
			})}
		</div>
	);
}
