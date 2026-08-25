import { ArrowUpIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/mainview/components/ui/alert-dialog";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/mainview/components/ui/context-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/mainview/components/ui/table";
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { trpc } from "@/mainview/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/shared/app-router";

type HistoryRow = inferRouterOutputs<AppRouter>["history"]["list"]["queued"][number];
type HistoryKind = "history" | "queued";

const clearLabels = {
	history: "history",
	queued: "queue",
} as const;

function HistorySection({
	label,
	rows,
	queued,
	onOpen,
	onMenu,
}: {
	label: string;
	rows: HistoryRow[];
	queued: boolean;
	onOpen: (row: HistoryRow) => void;
	onMenu: (row: HistoryRow) => void;
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
				<TableRow
					key={`${row.kind}:${row.id}`}
					className={row.animeId > 0 ? "cursor-pointer" : undefined}
					onClick={() => {
						onOpen(row);
					}}
					onContextMenu={() => {
						onMenu(row);
					}}
				>
					<TableCell>
						<div className="flex items-center gap-2 truncate">
							{queued ? (
								<ArrowUpIcon className="size-3.5 shrink-0 text-primary" />
							) : (
								<FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
							)}
							<button
								type="button"
								disabled={row.animeId <= 0}
								className="truncate rounded-sm text-left text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default"
								onClick={(event) => {
									event.stopPropagation();
									onOpen(row);
								}}
							>
								{row.title}
							</button>
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
	const utils = trpc.useUtils();
	const animeInfo = useAnimeInfoNav();
	const [menuRow, setMenuRow] = useState<HistoryRow | null>(null);
	const [clearKind, setClearKind] = useState<HistoryKind | null>(null);

	function refresh(): void {
		void utils.history.list.invalidate();
		void utils.history.queuedCount.invalidate();
	}

	const remove = trpc.history.remove.useMutation({ onSuccess: refresh });
	const clear = trpc.history.clear.useMutation({ onSuccess: refresh });
	const queued = query.data?.queued ?? [];
	const history = query.data?.history ?? [];
	const isEmpty = queued.length === 0 && history.length === 0;

	function openInfo(row: HistoryRow): void {
		if (row.animeId <= 0) {
			return;
		}
		animeInfo.open({ id: row.animeId, infoTab: "main" });
	}

	if (query.isPending && !query.data) {
		return (
			<ScrollArea className="h-full min-h-0">
				<TableRowsSkeleton
					columnCount={3}
					headers={["Anime title", "Details", "Last modified"]}
				/>
			</ScrollArea>
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
		<>
			<ContextMenu>
				<ContextMenuTrigger className="block h-full min-h-0">
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
									onOpen={openInfo}
									onMenu={setMenuRow}
								/>
								<HistorySection
									label="History"
									rows={history}
									queued={false}
									onOpen={openInfo}
									onMenu={setMenuRow}
								/>
							</TableBody>
						</Table>
					</ScrollArea>
				</ContextMenuTrigger>
				<ContextMenuContent className="min-w-48">
					<ContextMenuItem
						disabled={!menuRow || menuRow.animeId <= 0}
						onClick={() => {
							if (menuRow) {
								openInfo(menuRow);
							}
						}}
					>
						Information
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!menuRow || remove.isPending}
						variant="destructive"
						onClick={() => {
							if (menuRow) {
								void remove.mutateAsync({ id: menuRow.id });
							}
						}}
					>
						Delete
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						disabled={history.length === 0}
						onClick={() => {
							setClearKind("history");
						}}
					>
						Clear history...
					</ContextMenuItem>
					<ContextMenuItem
						disabled={queued.length === 0}
						onClick={() => {
							setClearKind("queued");
						}}
					>
						Clear queue...
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
			<AlertDialog
				open={clearKind != null}
				onOpenChange={(open) => {
					if (!open) {
						setClearKind(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Clear {clearLabels[clearKind ?? "history"]}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{clearKind === "queued"
								? "Discard all pending list updates? They will not be sent to AniList."
								: "Remove all history entries?"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={clear.isPending}
							onClick={() => {
								if (!clearKind) {
									return;
								}
								void clear.mutateAsync({ kind: clearKind }).then(() => {
									setClearKind(null);
								});
							}}
						>
							Clear
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
