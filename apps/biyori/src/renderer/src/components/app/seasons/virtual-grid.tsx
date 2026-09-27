import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import type { SeasonItem, SeasonSortBy, SeasonViewAs } from "@/lib/schemas/seasons";
import { SeasonCard } from "@/mainview/components/app/seasons/card";
import { SeasonDisplay, seasonGridClass } from "@/mainview/components/app/seasons/display";
import { isAltView } from "@/mainview/components/app/seasons/grid-skeleton";
import { flattenSeasonVirtualItems, type SeasonGroup, seasonGridColumns } from "@/mainview/lib/season-view";
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
	useEffect(() => {
		const node = rootRef.current;
		if (!node) {
			return;
		}
		const observer = new ResizeObserver((entries) => {
			setWidth(entries[0]?.contentRect.width ?? 0);
		});
		observer.observe(node);
		setWidth(node.clientWidth);
		return () => {
			observer.disconnect();
		};
	}, []);
	const columns = seasonGridColumns(viewAs, width || 640);
	const items = flattenSeasonVirtualItems(groups, columns);
	const stickyIndexes = items.flatMap((item, index) => (item.type === "header" ? [index] : []));
	const gap = 12;
	const rowPad = viewAs === "images" ? 16 : 12;
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => rootRef.current?.closest("[data-slot=scroll-area-viewport]") ?? null,
		estimateSize: (index) => {
			const item = items[index];
			if (!item || item.type === "header") {
				return 40;
			}
			if (viewAs === "images") {
				const colWidth = Math.max(80, ((width || 640) - rowPad * 2 - gap * (columns - 1)) / columns);
				return colWidth * 1.5 + gap;
			}
			if (viewAs === "guide") {
				return 68;
			}
			if (viewAs === "skyline") {
				return 248;
			}
			return 220;
		},
		overscan: 4,
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
						ref={virtualizer.measureElement}
						className={isStuck ? "sticky top-0 z-10 w-full" : "absolute top-0 left-0 w-full"}
						style={isStuck ? undefined : { transform: `translateY(${virtualRow.start}px)` }}>
						{item.type === "header" ? (
							<h2 className='border-b bg-muted px-4 py-2 text-sm font-medium'>
								{item.label}
								<span className='ml-2 text-muted-foreground'>({item.count})</span>
							</h2>
						) : (
							<ul className={seasonGridClass(viewAs)} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
								{item.items.map((card) => (
									<li key={card.id}>
										{isAltView(viewAs) ? (
											<SeasonDisplay
												item={card}
												viewAs={viewAs}
												listStatus={localById.get(card.id) ?? null}
												onOpen={() => onOpen(card)}
												onAdd={() => onAdd(card)}
												adding={adding}
											/>
										) : (
											<SeasonCard
												item={card}
												viewAs={viewAs}
												sortBy={sortBy}
												listStatus={localById.get(card.id) ?? null}
												onOpen={() => onOpen(card)}
												onAdd={() => onAdd(card)}
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
