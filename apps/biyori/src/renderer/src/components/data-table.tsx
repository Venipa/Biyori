import { flexRender, type Header, type Row, type Table as TanstackTable } from "@tanstack/react-table";
import { ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
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

function rowCells<TData>(row: Row<TData>, indent: boolean): ReactNode {
	return row.getVisibleCells().map((cell, index) => (
		<TableCell
			key={cell.id}
			className={cn("overflow-hidden", cell.column.columnDef.meta?.className, indent && index === 0 && "pl-8")}
			style={{ width: cell.column.getSize() }}>
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

function GroupHeader({ colSpan, children }: { colSpan: number; children: ReactNode }) {
	return (
		<TableRow className='hover:bg-transparent'>
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

export function DataTable<TData>({
	table,
	onRowClick,
	renderRow,
	groupBy,
	groupOrder,
	groupLabel,
	compact = false,
}: {
	table: TanstackTable<TData>;
	onRowClick?: (row: Row<TData>) => void;
	renderRow?: (row: Row<TData>, cells: ReactNode) => ReactNode;
	groupBy?: (row: Row<TData>) => string;
	groupOrder?: readonly string[];
	groupLabel?: (groupingValue: unknown) => ReactNode;
	compact?: boolean;
}) {
	const colSpan = table.getVisibleLeafColumns().length;
	const leaves = table.getRowModel().rows.filter((row) => row.depth === 0);

	function renderLeaf(row: Row<TData>, indent = false): ReactNode {
		const cells = rowCells(row, indent);
		if (renderRow) {
			return <Fragment key={row.id}>{renderRow(row, cells)}</Fragment>;
		}
		return <DefaultRow key={row.id} row={row} cells={cells} onRowClick={onRowClick} />;
	}

	function renderGroups(): ReactNode {
		const buckets = new Map<string, Row<TData>[]>();
		for (const row of leaves) {
			if (row.getIsGrouped() || !groupBy) {
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
		return orderedGroupKeys(buckets.keys(), groupOrder).map((key) => (
			<Fragment key={key}>
				<GroupHeader colSpan={colSpan}>{groupLabel ? groupLabel(key) : key}</GroupHeader>
				{(buckets.get(key) ?? []).map((row) => renderLeaf(row))}
			</Fragment>
		));
	}

	return (
		<Table
			containerClassName='overflow-x-auto overflow-y-visible'
			className={cn("table-fixed", compact ? "[&_th]:h-8 [&_td]:py-1" : undefined)}
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
				{groupBy
					? renderGroups()
					: leaves.map((row) => {
							if (row.getIsGrouped()) {
								return (
									<Fragment key={row.id}>
										<GroupHeader colSpan={colSpan}>{groupLabel ? groupLabel(row.groupingValue) : String(row.groupingValue)}</GroupHeader>
										{row.subRows.map((subRow) => renderLeaf(subRow, true))}
									</Fragment>
								);
							}
							return renderLeaf(row);
						})}
			</TableBody>
		</Table>
	);
}
