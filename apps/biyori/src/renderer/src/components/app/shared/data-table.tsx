import { useTranslation } from "@biyori/translations/react";
import { flexRender, type Header, type Row, type Table as TanstackTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon } from "lucide-react";
import { type ComponentProps, type CSSProperties, cloneElement, isValidElement, memo, type ReactElement, type ReactNode, useEffect, useRef } from "react";
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

/** Widths live in CSS variables on the table so resizing does not re-render memoized rows. */
function columnWidth(id: string): string {
	return `var(--col-${id}-size)`;
}

function rowCells<TData>(row: Row<TData>, indent: boolean): ReactNode {
	return row.getVisibleCells().map((cell, index) => (
		<TableCell
			key={cell.id}
			className={cn("overflow-hidden", cell.column.columnDef.meta?.className, indent && index === 0 && "pl-8")}
			style={{ width: columnWidth(cell.column.id) }}>
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
		return <ChevronUpIcon className='size-3.5 shrink-0' />;
	}
	if (sorted === "desc") {
		return <ChevronDownIcon className='size-3.5 shrink-0' />;
	}
	return <ChevronsUpDownIcon className='size-3.5 shrink-0 opacity-40' />;
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
	// keys may be a one-shot iterator (Map.keys), already consumed by the Set
	for (const key of seen) {
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

type LeafRowProps<TData> = {
	row: Row<TData>;
	indent: boolean;
	index: number;
	height: number | undefined;
	version: string;
	columnsKey: string;
	render: (row: Row<TData>, cells: ReactNode) => ReactNode;
	measure: ((element: Element | null) => void) | undefined;
};

function LeafRowImpl<TData>({ row, indent, index, height, render, measure }: LeafRowProps<TData>) {
	const node = render(row, rowCells(row, indent));
	if (!isValidElement(node)) {
		return node;
	}
	const element = node as ReactElement<{ "data-index"?: number; "data-stripe"?: string; ref?: (element: Element | null) => void; style?: CSSProperties }>;
	return cloneElement(element, {
		"data-index": index,
		// stripe by virtual index: :nth-child would count the virtual spacer row
		"data-stripe": index % 2 === 1 ? "" : undefined,
		ref: measure,
		style: height ? { ...element.props.style, height } : element.props.style,
	});
}

// render is read fresh each call; rows only re-render when their identity, version or visible columns change
const LeafRow = memo(
	LeafRowImpl,
	(a, b) => a.row === b.row && a.indent === b.indent && a.index === b.index && a.version === b.version && a.columnsKey === b.columnsKey && a.height === b.height,
) as typeof LeafRowImpl;

export function DataTable<TData>({
	table,
	onRowClick,
	renderRow,
	groupBy,
	groupOrder,
	groupLabel,
	compact = false,
	rowSize: rowSizeProp,
	rowVersion,
}: {
	table: TanstackTable<TData>;
	onRowClick?: (row: Row<TData>) => void;
	renderRow?: (row: Row<TData>, cells: ReactNode) => ReactNode;
	groupBy?: (row: Row<TData>) => string;
	groupOrder?: readonly string[];
	groupLabel?: (groupingValue: unknown) => ReactNode;
	compact?: boolean;
	/** Fixed row height: skips per-row measuring. */
	rowSize?: number;
	/** Enables row memoization: rows re-render only when this value changes (or the row/columns do). */
	rowVersion?: (row: Row<TData>) => string;
}) {
	const { t } = useTranslation();
	const rootRef = useRef<HTMLDivElement>(null);
	const leaves = table.getRowModel().rows.filter((row) => row.depth === 0);
	const items = flattenTableItems(leaves, groupBy, groupOrder, groupLabel);
	const rowSize = rowSizeProp ?? (compact ? 32 : 40);
	const renderTick = useRef(0);
	renderTick.current += 1;
	const visibleColumns = table.getVisibleLeafColumns();
	const columnsKey = visibleColumns.map((column) => column.id).join(",");
	const columnVars: Record<string, string> = { width: `${table.getTotalSize()}px` };
	for (const column of visibleColumns) {
		columnVars[`--col-${column.id}-size`] = `${column.getSize()}px`;
	}
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => rootRef.current?.closest("[data-slot=scroll-area-viewport]") ?? null,
		estimateSize: (index) => (items[index]?.type === "group" ? 32 : rowSize),
		overscan: 8,
		measureElement: rowSizeProp ? undefined : (element) => element.getBoundingClientRect().height,
	});
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-measure cached sizes when the fixed row height changes
	useEffect(() => {
		virtualizer.measure();
	}, [virtualizer, rowSize]);
	const virtualItems = virtualizer.getVirtualItems();
	const paddingTop = virtualItems[0]?.start ?? 0;
	const paddingBottom = virtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0);

	function renderLeaf(row: Row<TData>, cells: ReactNode): ReactNode {
		return renderRow ? renderRow(row, cells) : <DefaultRow row={row} cells={cells} onRowClick={onRowClick} />;
	}

	return (
		<div ref={rootRef}>
			<Table
				containerClassName='overflow-visible'
				className={cn("table-fixed", compact ? "[&_th]:h-8 [&_td]:py-1" : rowSize >= 56 ? "[&_th]:h-10 [&_td]:py-2" : undefined)}
				style={columnVars as CSSProperties}>
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
										style={{ width: columnWidth(header.column.id) }}>
										<SortableHead header={header} />
										{header.column.getCanResize() ? (
											<button
												type='button'
												tabIndex={-1}
												aria-label={t("common.resizeColumn", { column: header.column.id })}
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
							<td colSpan={visibleColumns.length} style={{ height: paddingTop, padding: 0, border: 0 }} />
						</tr>
					) : null}
					{virtualItems.map((virtualRow) => {
						const item = items[virtualRow.index];
						if (!item) {
							return null;
						}
						if (item.type === "group") {
							return (
								<GroupHeader key={item.key} colSpan={visibleColumns.length} data-index={virtualRow.index} ref={rowSizeProp ? undefined : virtualizer.measureElement}>
									{item.label}
								</GroupHeader>
							);
						}
						return (
							<LeafRow
								key={item.key}
								row={item.row}
								indent={item.indent}
								index={virtualRow.index}
								height={rowSizeProp}
								version={rowVersion ? rowVersion(item.row) : String(renderTick.current)}
								columnsKey={columnsKey}
								render={renderLeaf}
								measure={rowSizeProp ? undefined : virtualizer.measureElement}
							/>
						);
					})}
					{paddingBottom > 0 ? (
						<tr aria-hidden>
							<td colSpan={visibleColumns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} />
						</tr>
					) : null}
				</TableBody>
			</Table>
		</div>
	);
}
