import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { ProgressIndicator, ProgressRoot, ProgressTrack } from "@/mainview/components/ui/progress";

function clampCount(value: number, max: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(max, Math.max(0, Math.trunc(value)));
}

function EpisodeCountInput({
	id,
	value,
	max,
	total,
	onChange,
	onBlur,
	invalid,
	showProgressBar = false,
}: {
	id: string;
	value: number;
	max: number;
	total: number;
	onChange: (next: number) => void;
	onBlur?: () => void;
	invalid?: boolean;
	showProgressBar?: boolean;
}) {
	const count = clampCount(value, max);
	const knownTotal = total > 0;

	return (
		<div className='flex min-w-0 flex-col gap-2'>
			<div className='flex items-center gap-2'>
				<Button
					type='button'
					variant='outline'
					size='icon'
					aria-label='One episode back'
					disabled={count <= 0}
					onClick={() => {
						onChange(count - 1);
					}}>
					<MinusIcon />
				</Button>
				<Input
					id={id}
					type='number'
					inputMode='numeric'
					min={0}
					max={max}
					value={count}
					aria-invalid={invalid || undefined}
					onBlur={onBlur}
					onChange={(event) => {
						onChange(clampCount(event.target.value === "" ? 0 : Number(event.target.value), max));
					}}
					className='min-w-0 w-16 appearance-none px-1 text-center tabular-nums tracking-tight text-base'
				/>
				<Button
					type='button'
					variant='outline'
					size='icon'
					aria-label='One episode forward'
					disabled={count >= max}
					onClick={() => {
						onChange(count + 1);
					}}>
					<PlusIcon />
				</Button>
				{knownTotal ? <span className='text-xs whitespace-nowrap text-muted-foreground'>of {total}</span> : null}
			</div>
			{knownTotal && showProgressBar ? (
				<ProgressRoot value={Math.min(count, total)} max={total} aria-hidden>
					<ProgressTrack>
						<ProgressIndicator />
					</ProgressTrack>
				</ProgressRoot>
			) : null}
		</div>
	);
}

export { EpisodeCountInput };
