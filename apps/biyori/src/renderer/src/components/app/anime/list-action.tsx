import { t, useTranslation } from "@biyori/translations/react";
import { Button } from "@/mainview/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { type ListStatus, listStatusSchema } from "@/shared/list";

export function listStatusLabel(status: string): string {
	switch (status) {
		case "Currently watching":
			return t("list.currentlyWatching");
		case "Completed":
			return t("list.completed");
		case "On hold":
			return t("list.onHold");
		case "Dropped":
			return t("list.dropped");
		case "Plan to watch":
			return t("list.planToWatch");
		default:
			return status;
	}
}

export function listStatusShortText(status: ListStatus): string {
	switch (status) {
		case "Currently watching":
			return t("list.watching");
		case "Completed":
			return t("list.completed");
		case "On hold":
			return t("list.onHoldShort");
		case "Dropped":
			return t("list.dropped");
		case "Plan to watch":
			return t("list.planned");
	}
}

function statusItems(): Record<ListStatus, string> {
	return Object.fromEntries(listStatusSchema.options.map((value) => [value, listStatusLabel(value)])) as Record<ListStatus, string>;
}

type AnimeListActionProps = {
	mediaId: number;
	onAdded?: (id: number) => void;
	size?: "sm" | "default";
	className?: string;
};

export function AnimeListAction({ mediaId, onAdded, size, className }: AnimeListActionProps) {
	const { t } = useTranslation();
	const utils = trpc.useUtils();
	const addFromSearch = trpc.anilist.addFromSearch.useMutation();

	return (
		<Button
			type='button'
			size={size}
			className={cn("w-full", className)}
			disabled={addFromSearch.isPending}
			onClick={() => {
				void addFromSearch.mutateAsync({ mediaId }).then((result) => {
					void invalidateAnimeQueries(utils, "added", result.id);
					onAdded?.(result.id);
				});
			}}>
			{t("anime.addToList")}
		</Button>
	);
}

export function AnimeListStatusSelect({
	value,
	onValueChange,
	id,
	size,
	className,
	"aria-label": ariaLabel,
}: {
	value: string;
	onValueChange: (value: ListStatus) => void;
	id?: string;
	size?: "sm" | "default";
	className?: string;
	"aria-label"?: string;
}) {
	useTranslation();
	return (
		<Select
			value={value}
			items={statusItems()}
			onValueChange={(next) => {
				if (typeof next !== "string") {
					return;
				}
				const parsed = listStatusSchema.safeParse(next);
				if (!parsed.success) {
					return;
				}
				onValueChange(parsed.data);
			}}>
			<SelectTrigger id={id} size={size} className={cn("w-full", className)} aria-label={ariaLabel}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent alignItemWithTrigger={false} align='start'>
				<SelectGroup>
					{listStatusSchema.options.map((option) => (
						<SelectItem key={option} value={option}>
							{listStatusLabel(option)}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
