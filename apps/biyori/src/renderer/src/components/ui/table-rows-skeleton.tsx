import { Skeleton } from "@/mainview/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/mainview/components/ui/table";

const DEFAULT_ROW_COUNT = 12;

type TableRowsSkeletonProps = {
	columnCount: number;
	rowCount?: number;
	headers?: readonly string[];
};

export function TableRowsSkeleton({
	columnCount,
	rowCount = DEFAULT_ROW_COUNT,
	headers,
}: TableRowsSkeletonProps) {
	const columns = Math.max(columnCount, headers?.length ?? 0, 1);

	return (
		<Table containerClassName="overflow-visible">
			<TableHeader className="sticky top-0 z-20 bg-card [&_th]:bg-card">
				<TableRow className="hover:bg-transparent">
					{Array.from({ length: columns }, (_, index) => (
						<TableHead key={index}>
							{headers?.[index] ?? <Skeleton className="h-4 w-24" />}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: rowCount }, (_, rowIndex) => (
					<TableRow key={rowIndex} className="hover:bg-transparent">
						{Array.from({ length: columns }, (_, columnIndex) => (
							<TableCell key={columnIndex}>
								<Skeleton className="h-4 w-full" />
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
