import { Popover } from "@base-ui/react/popover";
import { ChevronDownIcon } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { type ListStatus, listStatusSchema } from "@/shared/list";

type AnimeScoreControlProps = {
	animeId: number;
	score: number | null;
	status: string;
	progress: number;
	notes: string;
	rewatching: boolean;
	timesRewatched?: number;
	dateStarted?: string | null;
	dateCompleted?: string | null;
	scoreSide?: "left" | "right";
	showChevron?: boolean;
};

function storedScore(score: number | null): number {
	if (score == null || score <= 0) {
		return 0;
	}
	return Math.min(100, Math.trunc(score));
}

export function AnimeScoreControl({
	animeId,
	score,
	status,
	progress,
	notes,
	rewatching,
	timesRewatched = 0,
	dateStarted = null,
	dateCompleted = null,
	scoreSide = "left",
	showChevron = true,
}: AnimeScoreControlProps) {
	const scoreId = useId();
	const utils = trpc.useUtils();
	const saveEntry = trpc.anilist.saveEntry.useMutation();
	const current = storedScore(score);
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(current);
	const parsedStatus = listStatusSchema.safeParse(status);
	const label = current > 0 ? `Score ${current}` : "Score";
	const scorePart = <span className='inline-flex min-w-8 items-center justify-center self-stretch bg-muted px-2 tabular-nums'>{current > 0 ? current : "-"}</span>;
	const labelPart = (
		<span className='inline-flex items-center gap-1 px-2.5'>
			Score
			{showChevron ? <ChevronDownIcon className={cn("transition-transform duration-200 ease-out motion-reduce:transition-none", open && "rotate-180")} /> : null}
		</span>
	);
	const divider = <span aria-hidden className='w-px self-stretch bg-border' />;

	function commit(next: number): void {
		if (!parsedStatus.success || next === current || saveEntry.isPending) {
			return;
		}
		const listStatus: ListStatus = parsedStatus.data;
		void saveEntry
			.mutateAsync({
				animeId,
				status: listStatus,
				progress,
				notes,
				rewatching,
				score: next > 0 ? next : null,
				timesRewatched,
				dateStarted,
				dateCompleted,
			})
			.then(() => {
				utils.media.nowPlaying.setData(undefined, (snapshot) => {
					if (!snapshot?.match || snapshot.match.id !== animeId) {
						return snapshot;
					}
					return { ...snapshot, match: { ...snapshot.match, score: next } };
				});
				void invalidateAnimeQueries(utils, "entrySaved", animeId);
			});
	}

	return (
		<Popover.Root
			open={open}
			onOpenChange={(next) => {
				if (next) {
					setDraft(current);
				} else {
					commit(draft);
				}
				setOpen(next);
			}}>
			<Popover.Trigger
				render={
					<Button type='button' size='sm' variant='outline' disabled={!parsedStatus.success || saveEntry.isPending} aria-label={label} className='h-7 gap-0 overflow-hidden p-0' />
				}>
				{scoreSide === "left" ? scorePart : labelPart}
				{divider}
				{scoreSide === "left" ? labelPart : scorePart}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner className='isolate z-50 outline-none' side='bottom' align='start' sideOffset={4}>
					<Popover.Popup className='z-50 w-56 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none data-[ending-style]:-translate-y-2 data-[starting-style]:-translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0'>
						<div className='flex flex-col gap-3'>
							<label htmlFor={scoreId} className='text-sm font-medium'>
								Score
							</label>
							<input
								type='range'
								min={0}
								max={100}
								step={1}
								value={draft}
								aria-label='Score'
								className='w-full accent-primary'
								onChange={(event) => {
									setDraft(Number(event.target.value));
								}}
							/>
							<Input
								id={scoreId}
								type='number'
								min={0}
								max={100}
								inputMode='numeric'
								value={draft > 0 ? draft : ""}
								placeholder='0'
								onChange={(event) => {
									const raw = event.target.value;
									if (raw === "") {
										setDraft(0);
										return;
									}
									const next = Number(raw);
									if (!Number.isFinite(next)) {
										return;
									}
									setDraft(Math.min(100, Math.max(0, Math.trunc(next))));
								}}
							/>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
