import { flexRender, type Header, type Row, type Table as TanstackTable } from "@tanstack/react-table";
import { ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { cn } from "@/mainview/lib/utils";

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData, TValue> {
		className?: string;
	}
}

function rowCells<TData>(row: Row<TData>, indent: boolean): ReactNode {
	return row.getVisibleCells().map((cell, index) => (
		<TableCell key={cell.id} className={cn(cell.column.columnDef.meta?.className, indent && index === 0 && "pl-8")}>
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
		return content;
	}
	const sorted = header.column.getIsSorted();
	return (
		<button
			type='button'
			className='inline-flex items-center gap-1 rounded-sm text-left font-medium hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none'
			onClick={header.column.getToggleSortingHandler()}>
			{content}
			<SortGlyph sorted={sorted} />
		</button>
	);
}

export function DataTable<TData>({
	table,
	onRowClick,
	renderRow,
	groupLabel,
}: {
	table: TanstackTable<TData>;
	onRowClick?: (row: Row<TData>) => void;
	renderRow?: (row: Row<TData>, cells: ReactNode) => ReactNode;
	groupLabel?: (groupingValue: unknown) => ReactNode;
}) {
	const colSpan = table.getVisibleLeafColumns().length;

	function renderLeaf(row: Row<TData>, indent = false): ReactNode {
		const cells = rowCells(row, indent);
		if (renderRow) {
			return <Fragment key={row.id}>{renderRow(row, cells)}</Fragment>;
		}
		return <DefaultRow key={row.id} row={row} cells={cells} onRowClick={onRowClick} />;
	}

	return (
		<Table containerClassName='overflow-visible'>
			<TableHeader className='sticky top-0 z-20 bg-card [&_th]:bg-card'>
				{table.getHeaderGroups().map((headerGroup) => (
					<TableRow key={headerGroup.id} className='hover:bg-transparent'>
						{headerGroup.headers.map((header) => (
							<TableHead key={header.id} colSpan={header.colSpan} className={header.column.columnDef.meta?.className}>
								<SortableHead header={header} />
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table
					.getRowModel()
					.rows.filter((row) => row.depth === 0)
					.map((row) => {
						if (row.getIsGrouped()) {
							return (
								<Fragment key={row.id}>
									<TableRow className='hover:bg-transparent'>
										<TableCell colSpan={colSpan} className='py-1.5 text-sm font-medium text-primary'>
											{groupLabel ? groupLabel(row.groupingValue) : String(row.groupingValue)}
										</TableCell>
									</TableRow>
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
