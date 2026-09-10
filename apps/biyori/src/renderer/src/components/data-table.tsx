import { flexRender, type Header, type Row, type Table as TanstackTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon } from "lucide-react";
import { type ComponentProps, cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { cn } from "@/mainview/lib/utils";

export const resizableTableOptions = {
	enableColumnResizing: true,
	columnResizeMode: "onChange" as const,
	defaultColumn: { minSize: 64, size: 140 },
};

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData, TValue> {
		className?: string;
	}
	interface TableMeta<TData> {
		playingId?: number | null;
	}
}

type FlatItem<TData> = { type: "group"; key: string; label: ReactNode } | { type: "row"; key: string; row: Row<TData>; indent: boolean };

function rowCells<TData>(row: Row<TData>, indent: boolean): ReactNode {
	return row.getVisibleCells().map((cell, index) => (
		<TableCell key={cell.id} className={cn("overflow-hidden", cell.column.columnDef.meta?.className, indent && index === 0 && "pl-8")} style={{ width: cell.column.getSize() }}>
			{flexRender(cell.column.columnDef.cell, cell.getContext())}
		</TableCell>
	));
}

function DefaultRow<TData>({ row, cells, onRowClick }: { row: Row<TData>; cells: ReactNode; onRowClick?: (row: Row<TData>) => void }) {
	return (
		<TableRow
			data-state={row.getIsSelected() ? "selected" : undefined}
			className={cn(onRowClick ? "cursor-pointer" : undefined)}
			onClick={() => {
				onRowClick?.(row);
			}}>
			{cells}
		</TableRow>
	);
}

function SortGlyph({ sorted }: { sorted: false | "asc" | "desc" }) {
	if (sorted === "asc") {
		return <ChevronUpIcon className='size-3.5' />;
	}
	if (sorted === "desc") {
		return <ChevronDownIcon className='size-3.5' />;
	}
	return <ChevronsUpDownIcon className='size-3.5 opacity-40' />;
}

function SortableHead<TData>({ header }: { header: Header<TData, unknown> }) {
	const content = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
	if (!header.column.getCanSort()) {
		return <div className='min-w-0 truncate pr-3'>{content}</div>;
	}
	const sorted = header.column.getIsSorted();
	return (
		<button
			type='button'
			className='inline-flex h-full min-w-0 w-full items-center gap-1 pr-3 text-left font-medium focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none'
			onClick={header.column.getToggleSortingHandler()}>
			<span className='truncate'>{content}</span>
			<SortGlyph sorted={sorted} />
		</button>
	);
}

function GroupHeader({ colSpan, children, ...props }: { colSpan: number; children: ReactNode } & ComponentProps<"tr">) {
	return (
		<TableRow className='hover:bg-transparent' {...props}>
			<TableCell colSpan={colSpan} className='py-1 text-sm font-medium text-primary'>
				{children}
			</TableCell>
		</TableRow>
	);
}

function orderedGroupKeys(keys: Iterable<string>, groupOrder: readonly string[] | undefined): string[] {
	const seen = new Set(keys);
	const ordered: string[] = [];
	if (groupOrder) {
		for (const key of groupOrder) {
			if (seen.has(key)) {
				ordered.push(key);
			}
		}
	}
	for (const key of keys) {
		if (!ordered.includes(key)) {
			ordered.push(key);
		}
	}
	return ordered;
}

function flattenTableItems<TData>(
	leaves: Row<TData>[],
	groupBy: ((row: Row<TData>) => string) | undefined,
	groupOrder: readonly string[] | undefined,
	groupLabel: ((groupingValue: unknown) => ReactNode) | undefined,
): FlatItem<TData>[] {
	const items: FlatItem<TData>[] = [];
	if (groupBy) {
		const buckets = new Map<string, Row<TData>[]>();
		for (const row of leaves) {
			if (row.getIsGrouped()) {
				continue;
			}
			const key = groupBy(row);
			const bucket = buckets.get(key);
			if (bucket) {
				bucket.push(row);
			} else {
				buckets.set(key, [row]);
			}
		}
		for (const key of orderedGroupKeys(buckets.keys(), groupOrder)) {
			items.push({ type: "group", key: `g-${key}`, label: groupLabel ? groupLabel(key) : key });
			for (const row of buckets.get(key) ?? []) {
				items.push({ type: "row", key: row.id, row, indent: false });
			}
		}
		return items;
	}
	for (const row of leaves) {
		if (row.getIsGrouped()) {
			items.push({ type: "group", key: `g-${row.id}`, label: groupLabel ? groupLabel(row.groupingValue) : String(row.groupingValue) });
			for (const subRow of row.subRows) {
				items.push({ type: "row", key: subRow.id, row: subRow, indent: true });
			}
			continue;
		}
		items.push({ type: "row", key: row.id, row, indent: false });
	}
	return items;
}

function attachVirtualMeasure(node: ReactNode, index: number, measure: (element: Element | null) => void): ReactNode {
	if (!isValidElement(node)) {
		return node;
	}
	return cloneElement(node as ReactElement<{ "data-index"?: number; ref?: (element: Element | null) => void }>, {
		"data-index": index,
		ref: measure,
	});
}

export function DataTable<TData>({
	table,
	onRowClick,
	renderRow,
	groupBy,
	groupOrder,
	groupLabel,
	compact = false,
	rowSize: rowSizeProp,
}: {
	table: TanstackTable<TData>;
	onRowClick?: (row: Row<TData>) => void;
	renderRow?: (row: Row<TData>, cells: ReactNode) => ReactNode;
	groupBy?: (row: Row<TData>) => string;
	groupOrder?: readonly string[];
	groupLabel?: (groupingValue: unknown) => ReactNode;
	compact?: boolean;
	rowSize?: number;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const colSpan = table.getVisibleLeafColumns().length;
	const leaves = table.getRowModel().rows.filter((row) => row.depth === 0);
	const items = flattenTableItems(leaves, groupBy, groupOrder, groupLabel);
	const rowSize = rowSizeProp ?? (compact ? 32 : 40);
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => rootRef.current?.closest("[data-slot=scroll-area-viewport]") ?? null,
		estimateSize: (index) => (items[index]?.type === "group" ? 32 : rowSize),
		overscan: 8,
		measureElement: (element) => element.getBoundingClientRect().height,
	});
	const virtualItems = virtualizer.getVirtualItems();
	const paddingTop = virtualItems[0]?.start ?? 0;
	const paddingBottom = virtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0);

	function renderLeaf(row: Row<TData>, indent: boolean): ReactNode {
		const cells = rowCells(row, indent);
		if (renderRow) {
			return renderRow(row, cells);
		}
		return <DefaultRow row={row} cells={cells} onRowClick={onRowClick} />;
	}

	return (
		<div ref={rootRef}>
			<Table
				containerClassName='overflow-visible'
				className={cn("table-fixed", compact ? "[&_th]:h-8 [&_td]:py-1" : rowSize >= 56 ? "[&_th]:h-10 [&_td]:py-2" : undefined)}
				style={{ width: table.getTotalSize() }}>
				<TableHeader className='sticky top-0 z-20 bg-card'>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id} className='hover:bg-transparent'>
							{headerGroup.headers.map((header) => {
								const sorted = header.column.getIsSorted();
								return (
									<TableHead
										key={header.id}
										colSpan={header.colSpan}
										aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
										className={cn(
											"relative overflow-visible bg-card transition-colors hover:bg-muted/60",
											sorted && "bg-muted/70 hover:bg-muted",
											header.column.columnDef.meta?.className,
										)}
										style={{ width: header.getSize() }}>
										<SortableHead header={header} />
										{header.column.getCanResize() ? (
											<button
												type='button'
												tabIndex={-1}
												aria-label={`Resize ${header.column.id} column`}
												className={cn(
													"absolute inset-y-0 -right-2 z-10 w-4 cursor-col-resize touch-none border-0 bg-transparent p-0",
													"after:pointer-events-none after:absolute after:inset-y-2 after:right-2 after:w-px after:bg-transparent hover:after:bg-border",
													header.column.getIsResizing() && "after:bg-primary",
												)}
												onMouseDown={header.getResizeHandler()}
												onTouchStart={header.getResizeHandler()}
												onClick={(event) => {
													event.stopPropagation();
												}}
											/>
										) : null}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{paddingTop > 0 ? (
						<tr aria-hidden>
							<td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0 }} />
						</tr>
					) : null}
					{virtualItems.map((virtualRow) => {
						const item = items[virtualRow.index];
						if (!item) {
							return null;
						}
						if (item.type === "group") {
							return (
								<GroupHeader key={item.key} colSpan={colSpan} data-index={virtualRow.index} ref={virtualizer.measureElement}>
									{item.label}
								</GroupHeader>
							);
						}
						return <Fragment key={item.key}>{attachVirtualMeasure(renderLeaf(item.row, item.indent), virtualRow.index, virtualizer.measureElement)}</Fragment>;
					})}
					{paddingBottom > 0 ? (
						<tr aria-hidden>
							<td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0 }} />
						</tr>
					) : null}
				</TableBody>
			</Table>
		</div>
	);
}
