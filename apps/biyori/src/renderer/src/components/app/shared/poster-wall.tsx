import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { chunk, posterColumns } from "@/mainview/lib/poster-wall";

/** Virtualized grid of fixed-size tiles; scrolls inside the nearest ScrollArea viewport. */
export function PosterWall<T>({
	items,
	getKey,
	tileWidth,
	rowHeight,
	gap = 12,
	renderTile,
}: {
	items: T[];
	getKey: (item: T) => string;
	tileWidth: number;
	rowHeight: number;
	gap?: number;
	renderTile: (item: T) => ReactNode;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	useEffect(() => {
		const node = rootRef.current;
		if (!node) {
			return;
		}
		// only re-render when the column count changes, not on every resized pixel
		const update = (next: number) => {
			setWidth((prev) => (prev && posterColumns(prev, tileWidth, gap) === posterColumns(next, tileWidth, gap) ? prev : next));
		};
		const observer = new ResizeObserver((entries) => {
			update(entries[0]?.contentRect.width ?? 0);
		});
		observer.observe(node);
		update(node.clientWidth);
		return () => {
			observer.disconnect();
		};
	}, [tileWidth, gap]);
	const columns = posterColumns(width || 640, tileWidth, gap);
	const lines = chunk(items, columns);
	const virtualizer = useVirtualizer({
		count: lines.length,
		getScrollElement: () => rootRef.current?.closest("[data-slot=scroll-area-viewport]") ?? null,
		estimateSize: () => rowHeight,
		overscan: 2,
	});
	return (
		<div ref={rootRef} className='relative w-full' style={{ height: virtualizer.getTotalSize() }}>
			{virtualizer.getVirtualItems().map((virtualRow) => {
				const line = lines[virtualRow.index];
				if (!line) {
					return null;
				}
				return (
					<ul
						key={virtualRow.index}
						className='absolute top-0 left-0 grid w-full'
						style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)`, gridTemplateColumns: `repeat(${columns}, ${tileWidth}px)`, gap }}>
						{line.map((item) => (
							<li key={getKey(item)}>{renderTile(item)}</li>
						))}
					</ul>
				);
			})}
		</div>
	);
}
