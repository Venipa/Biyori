import { ProgressIndicator, ProgressRoot, ProgressTrack } from "@/mainview/components/ui/progress";
import { listProgressLabel, listProgressLayout } from "@/mainview/lib/list-progress";
import { cn } from "@/mainview/lib/utils";
import type { ListStatus } from "@/shared/list";
import type { CSSProperties } from "react";

type AnimeListProgressProps = {
	watched: number;
	total: number;
	available: number;
	aired: number;
	finished: boolean;
	status: ListStatus;
};

function watchedBarClass(status: ListStatus): string {
	if (status === "Completed") {
		return "bg-primary";
	}
	if (status === "On hold") {
		return "bg-chart-3";
	}
	if (status === "Dropped") {
		return "bg-destructive";
	}
	if (status === "Plan to watch") {
		return "bg-muted-foreground/40";
	}
	return "bg-success";
}

export function AnimeListProgress({ watched, total, available, aired, finished, status }: AnimeListProgressProps) {
	const layout = listProgressLayout({ watched, total, available, aired, finished });
	const label = listProgressLabel(watched, total);
	const invalid = total > 0 && watched > total;
	const completedShort = status === "Completed" && total > 0 && watched < total;

	return (
		<div className='flex min-w-[10rem] items-center gap-1'>
			<ProgressRoot
				value={Math.round(layout.watched * 100)}
				className='min-w-0 flex-1'
				style={
					{
						"--list-progress-aired": `${layout.aired * 100}%`,
						"--list-progress-available-start": `${layout.availableStart * 100}%`,
						"--list-progress-available-width": `${Math.max(0, layout.availableEnd - layout.availableStart) * 100}%`,
					} as CSSProperties
				}>
				<ProgressTrack className='relative h-3 w-full overflow-hidden rounded-sm'>
					<span className='pointer-events-none absolute bottom-0 left-0 h-[3px] w-full bg-muted-foreground/35' />
					<span className='pointer-events-none absolute bottom-0 left-0 h-[3px] w-(--list-progress-aired) bg-destructive' />
					<ProgressIndicator className={cn("transition-none", watchedBarClass(status))} />
					<span className='pointer-events-none absolute bottom-0 left-(--list-progress-available-start) h-[3px] w-(--list-progress-available-width) bg-success/80' />
				</ProgressTrack>
			</ProgressRoot>
			<span className='grid w-[3.75rem] shrink-0 grid-cols-[1fr_auto_1fr] items-center text-xs tabular-nums'>
				<span className={cn("text-right", watched <= 0 ? "text-muted-foreground" : invalid || completedShort ? "text-primary" : undefined)}>{label.watched}</span>
				<span className='px-0.5 text-center text-muted-foreground'>/</span>
				<span className={total > 0 ? undefined : "text-muted-foreground"}>{label.total}</span>
			</span>
		</div>
	);
}
