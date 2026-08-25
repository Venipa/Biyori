import { Button } from "@/mainview/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/mainview/components/ui/select";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { listStatusSchema, type ListStatus } from "@/shared/list";
import { SelectListProps } from "@base-ui/react";

const STATUS_ITEMS: Record<ListStatus, string> = Object.fromEntries(
	listStatusSchema.options.map((value) => [value, value]),
) as Record<ListStatus, string>;

type AnimeListActionProps = {
	mediaId: number;
	onList: boolean;
	status?: string | null;
	progress: number;
	notes: string;
	rewatching: boolean;
	onAdded?: (id: number) => void;
	className?: string;
} & SelectListProps;

export function AnimeListAction({
	mediaId,
	onList,
	status,
	progress,
	notes,
	rewatching,
	onAdded,
	size,
	className,
}: AnimeListActionProps) {
	const utils = trpc.useUtils();
	const addFromSearch = trpc.anilist.addFromSearch.useMutation();
	const saveEntry = trpc.anilist.saveEntry.useMutation();
	const parsedStatus = listStatusSchema.safeParse(status);
	const listStatus = parsedStatus.success ? parsedStatus.data : "Plan to watch";
	const busy = addFromSearch.isPending || saveEntry.isPending;

	async function invalidateList(id: number): Promise<void> {
		await Promise.all([
			utils.anime.list.invalidate(),
			utils.anime.counts.invalidate(),
			utils.anime.listed.invalidate(),
			utils.anime.byId.invalidate({ id }),
			utils.statistics.summary.invalidate(),
			utils.history.list.invalidate(),
			utils.history.queuedCount.invalidate(),
		]);
	}

	if (!onList) {
		return (
			<Button
				type="button"
        size={size}
				className={cn("w-full", className)}
				disabled={busy}
				onClick={() => {
					void addFromSearch
						.mutateAsync({ mediaId })
						.then(async (result) => {
							await invalidateList(result.id);
							onAdded?.(result.id);
						});
				}}
			>
				Add to list
			</Button>
		);
	}

	return (
		<Select
			value={listStatus}
			items={STATUS_ITEMS}
			disabled={busy}
			size={size}
			onValueChange={(value) => {
				if (typeof value !== "string" || value === listStatus) {
					return;
				}
				const next = listStatusSchema.safeParse(value);
				if (!next.success) {
					return;
				}
				void saveEntry
					.mutateAsync({
						animeId: mediaId,
						status: next.data,
						progress,
						notes,
						rewatching,
					})
					.then(() => invalidateList(mediaId));
			}}
		>
			<SelectTrigger
				className={cn("w-full", className)}
				aria-label="List status"
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent alignItemWithTrigger={false} align="start">
				<SelectGroup>
					{listStatusSchema.options.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
