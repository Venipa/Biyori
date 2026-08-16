import { ArrowUpIcon, FileTextIcon } from "lucide-react";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/mainview/components/ui/table";
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { trpc } from "@/mainview/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/shared/app-router";

type HistoryRow = inferRouterOutputs<AppRouter>["history"]["list"]["queued"][number];

function HistorySection({
	label,
	rows,
	queued,
}: {
	label: string;
	rows: HistoryRow[];
	queued: boolean;
}) {
	if (rows.length === 0) {
		return null;
	}

	return (
		<>
			<TableRow className="hover:bg-transparent">
				<TableCell colSpan={3} className="py-1.5 text-sm font-medium text-primary">
					{label}
				</TableCell>
			</TableRow>
			{rows.map((row) => (
				<TableRow key={`${row.kind}:${row.id}`}>
					<TableCell>
						<div className="flex items-center gap-2 truncate">
							{queued ? (
								<ArrowUpIcon className="size-3.5 shrink-0 text-primary" />
							) : (
								<FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
							)}
							<span className="truncate text-primary">{row.title}</span>
						</div>
					</TableCell>
					<TableCell className="text-muted-foreground">
						Episode: {row.episode}
					</TableCell>
					<TableCell className="text-muted-foreground">
						{row.lastModified}
					</TableCell>
				</TableRow>
			))}
		</>
	);
}

export function HistoryView() {
	const query = trpc.history.list.useQuery();
	const queued = query.data?.queued ?? [];
	const history = query.data?.history ?? [];
	const isEmpty = queued.length === 0 && history.length === 0;

	if (query.isLoading) {
		return (
			<div className="flex flex-col gap-2 p-4">
				<Skeleton className="h-8 w-full" />
				<Skeleton className="h-8 w-full" />
			</div>
		);
	}

	if (isEmpty) {
		return (
			<Empty>
				<EmptyTitle>No history</EmptyTitle>
				<EmptyDescription>Watched episodes show up here.</EmptyDescription>
			</Empty>
		);
	}

	return (
		<ScrollArea className="h-full">
			<Table containerClassName="overflow-visible">
				<TableHeader className="sticky top-0 z-20 bg-card [&_th]:bg-card">
					<TableRow className="hover:bg-transparent">
						<TableHead>Anime title</TableHead>
						<TableHead>Details</TableHead>
						<TableHead>Last modified</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<HistorySection
						label="Queued for update"
						rows={queued}
						queued
					/>
					<HistorySection label="History" rows={history} queued={false} />
				</TableBody>
			</Table>
		</ScrollArea>
	);
}
