import { Popover } from "@base-ui/react/popover";
import { useTranslation } from "@biyori/translations/react";
import { ChevronDownIcon, StarIcon } from "lucide-react";
import { useId, useState } from "react";
import { type AnilistScoreFormat, displayToRaw, formatScore, rawToDisplay, scoreScale } from "@/lib/anilist-score";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { Slider } from "@/mainview/components/ui/slider";
import { useAnilistScoreFormat } from "@/mainview/lib/anilist-score-format";
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

type AnimeScoreFieldsProps = {
	id: string;
	raw: number | null;
	format: AnilistScoreFormat;
	onChange: (raw: number | null) => void;
};

function ScoreStars({ raw, format, onChange }: Pick<AnimeScoreFieldsProps, "raw" | "format" | "onChange">) {
	const { t } = useTranslation();
	const current = rawToDisplay(raw, format);
	return (
		<div className='flex items-center gap-0.5'>
			{[1, 2, 3, 4, 5].map((star) => (
				<Button
					key={star}
					type='button'
					variant='ghost'
					size='icon-sm'
					aria-label={t("anime.scoreValue", { score: `${star}/5` })}
					aria-pressed={star <= current}
					onClick={() => {
						onChange(displayToRaw(star, format));
					}}>
					<StarIcon className={cn(star <= current ? "fill-current" : "text-muted-foreground")} />
				</Button>
			))}
		</div>
	);
}

export function AnimeScoreFields({ id, raw, format, onChange }: AnimeScoreFieldsProps) {
	const { t } = useTranslation();
	const scale = scoreScale(format);
	const display = rawToDisplay(raw, format);
	if (format === "POINT_5") {
		return <ScoreStars raw={raw} format={format} onChange={onChange} />;
	}
	return (
		<div className='flex items-center gap-2'>
			<Slider
				className='min-w-0 flex-1'
				min={0}
				max={scale.max}
				step={scale.step}
				value={display}
				aria-label={t("anime.score")}
				onValueChange={(next) => {
					onChange(displayToRaw(next, format));
				}}
			/>
			<Input
				id={id}
				className='w-20 tabular-nums'
				type='number'
				min={0}
				max={scale.max}
				step={scale.step}
				inputMode={scale.step < 1 ? "decimal" : "numeric"}
				placeholder={t("anime.scoreRange", { min: 0, max: scale.max })}
				value={display > 0 ? display : ""}
				onChange={(event) => {
					const value = event.target.value;
					if (value === "") {
						onChange(null);
						return;
					}
					const next = Number(value);
					if (!Number.isFinite(next)) {
						return;
					}
					onChange(displayToRaw(next, format));
				}}
			/>
		</div>
	);
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
	const { t } = useTranslation();
	const utils = trpc.useUtils();
	const saveEntry = trpc.anilist.saveEntry.useMutation();
	const format = useAnilistScoreFormat();
	const currentRaw = score != null && score > 0 ? Math.min(100, Math.trunc(score)) : 0;
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<number | null>(currentRaw > 0 ? currentRaw : null);
	const parsedStatus = listStatusSchema.safeParse(status);
	const formatted = formatScore(currentRaw > 0 ? currentRaw : null, format);
	const label = currentRaw > 0 ? t("anime.scoreValue", { score: formatted }) : t("anime.score");
	const scorePart = <span className='inline-flex min-w-8 items-center justify-center self-stretch bg-muted px-2 tabular-nums'>{formatted}</span>;
	const labelPart = (
		<span className='inline-flex items-center gap-1 px-2.5'>
			{t("anime.score")}
			{showChevron ? <ChevronDownIcon className={cn("transition-transform duration-200 ease-out motion-reduce:transition-none", open && "rotate-180")} /> : null}
		</span>
	);
	const divider = <span aria-hidden className='w-px self-stretch bg-border' />;

	function commit(next: number | null): void {
		const stored = next != null && next > 0 ? next : null;
		const previous = currentRaw > 0 ? currentRaw : null;
		if (!parsedStatus.success || stored === previous || saveEntry.isPending) {
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
				score: stored,
				timesRewatched,
				dateStarted,
				dateCompleted,
			})
			.then(() => {
				utils.media.nowPlaying.setData(undefined, (snapshot) => {
					if (!snapshot?.match || snapshot.match.id !== animeId) {
						return snapshot;
					}
					return { ...snapshot, match: { ...snapshot.match, score: stored } };
				});
				void invalidateAnimeQueries(utils, "entrySaved", animeId);
			});
	}

	return (
		<Popover.Root
			open={open}
			onOpenChange={(next) => {
				if (next) {
					setDraft(currentRaw > 0 ? currentRaw : null);
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
					<Popover.Popup className='z-50 w-72 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none data-[ending-style]:-translate-y-2 data-[starting-style]:-translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0'>
						<div className='flex flex-col gap-3'>
							<label htmlFor={scoreId} className='text-sm font-medium'>
								{t("anime.score")}
							</label>
							<AnimeScoreFields id={scoreId} raw={draft} format={format} onChange={setDraft} />
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
