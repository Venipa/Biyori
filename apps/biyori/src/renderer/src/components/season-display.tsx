import type { ReactNode } from "react";
import type { SeasonItem } from "@/lib/schemas/seasons";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { AnimeItemCommands } from "@/mainview/components/anime-item-commands";
import { Button } from "@/mainview/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/mainview/components/ui/context-menu";
import { airingBarClass, airStamp, formatPopularityCompact, formatScore, skylinePosterHeight } from "@/mainview/lib/season-view";
import { cn } from "@/mainview/lib/utils";
import { type ListStatus, listStatusShortLabel } from "@/shared/list";

const commandParts = {
	Item: ContextMenuItem,
	Sub: ContextMenuSub,
	SubTrigger: ContextMenuSubTrigger,
	SubContent: ContextMenuSubContent,
	Separator: ContextMenuSeparator,
	Shortcut: ContextMenuShortcut,
};

export type SeasonAltView = "guide" | "skyline";

type SeasonDisplayProps = {
	item: SeasonItem;
	viewAs: SeasonAltView;
	listStatus: ListStatus | null;
	onOpen: () => void;
	onAdd: () => void;
	adding: boolean;
};

export function seasonGridClass(viewAs: SeasonAltView | "tiles" | "images"): string {
	switch (viewAs) {
		case "images":
			return "grid gap-3 p-4";
		case "guide":
			return "grid divide-y border-b";
		case "skyline":
			return "grid items-end gap-x-1.5 border-b px-3 pt-4 pb-2";
		default:
			return "grid gap-3 p-3";
	}
}

export function SeasonDisplay(props: SeasonDisplayProps) {
	const { item, viewAs, listStatus, onOpen, onAdd, adding } = props;
	const body = viewAs === "guide" ? <GuideRow item={item} listStatus={listStatus} onAdd={onAdd} adding={adding} /> : <SkylineRow item={item} listStatus={listStatus} />;

	return (
		<ContextMenu>
			<ContextMenuTrigger
				className={cn("block w-full cursor-pointer text-left outline-none", "focus-visible:ring-2 focus-visible:ring-ring", viewAs === "guide" ? "hover:bg-muted/60" : undefined)}
				tabIndex={0}
				onClick={onOpen}
				onKeyDown={(event) => {
					if (event.target !== event.currentTarget) {
						return;
					}
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onOpen();
					}
				}}>
				{body}
			</ContextMenuTrigger>
			<ContextMenuContent className='min-w-56'>
				<AnimeItemCommands
					parts={commandParts}
					mode='discover'
					discover={{
						id: item.id,
						title: item.title,
						episodes: item.episodes,
						trailerId: item.trailerId,
						listStatus,
					}}
					onInformation={onOpen}
				/>
			</ContextMenuContent>
		</ContextMenu>
	);
}

function otherTitle(item: SeasonItem): string | null {
	const native = item.titles.native;
	if (native && native !== item.title) {
		return native;
	}
	const english = item.titles.english;
	if (english && english !== item.title) {
		return english;
	}
	return null;
}

function metaLine(item: SeasonItem): string {
	const episodes = item.episodes > 0 ? `${item.episodes} eps` : null;
	const genres = item.genres.slice(0, 2).join(", ");
	return [item.format || "TV", episodes, genres || null].filter((part) => part != null).join(", ");
}

function ListOrAdd(props: { listStatus: ListStatus | null; onAdd: () => void; adding: boolean; className?: string }) {
	const { listStatus, onAdd, adding, className } = props;
	if (listStatus) {
		return <span className={cn("truncate text-xs text-muted-foreground", className)}>{listStatusShortLabel(listStatus)}</span>;
	}
	return (
		<Button
			type='button'
			size='xs'
			variant='secondary'
			className={className}
			disabled={adding}
			onClick={(event) => {
				event.stopPropagation();
				onAdd();
			}}>
			Add to list
		</Button>
	);
}

function GuideRow(props: { item: SeasonItem; listStatus: ListStatus | null; onAdd: () => void; adding: boolean }) {
	const { item, listStatus, onAdd, adding } = props;
	const stamp = airStamp(item.startDate);
	const alt = otherTitle(item);
	return (
		<div className='flex min-h-16 items-stretch gap-3 pr-3'>
			<div className={cn("w-1 shrink-0", airingBarClass(item.status))} />
			<div className='flex w-14 shrink-0 flex-col items-center justify-center border-r border-dashed'>
				{stamp ? (
					<>
						<span className='text-[10px] tracking-widest text-muted-foreground'>{stamp.month}</span>
						<span className='text-lg leading-none font-medium tabular-nums'>{stamp.day}</span>
					</>
				) : (
					<span className='text-[10px] tracking-widest text-muted-foreground'>TBA</span>
				)}
			</div>
			<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' className='my-2 aspect-2/3 w-9 shrink-0 overflow-hidden rounded-sm bg-muted' lazy />
			<div className='flex min-w-0 flex-1 flex-col justify-center py-2'>
				<span className='truncate text-sm font-medium'>{item.title}</span>
				<span className='truncate text-xs text-muted-foreground'>
					{alt ? `${alt}, ` : ""}
					{metaLine(item)}
				</span>
			</div>
			<ListOrAdd listStatus={listStatus} onAdd={onAdd} adding={adding} className='self-center' />
			<div className='flex w-14 shrink-0 flex-col items-end justify-center self-center'>
				<span className='text-sm font-medium tabular-nums'>{formatScore(item.averageScore)}</span>
				<span className='text-[10px] tabular-nums text-muted-foreground'>{formatPopularityCompact(item.popularity)}</span>
			</div>
		</div>
	);
}

function SkylineRow(props: { item: SeasonItem; listStatus: ListStatus | null }) {
	const { item, listStatus } = props;
	const unrated = item.averageScore <= 0;
	return (
		<div className='flex min-w-0 flex-col justify-end gap-1'>
			<div className='flex flex-col overflow-hidden rounded-t-sm bg-muted' style={{ height: skylinePosterHeight(item.averageScore) }}>
				<div className={cn("h-0.5 shrink-0", airingBarClass(item.status))} />
				<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' className={cn("min-h-0 w-full flex-1", unrated ? "opacity-60" : undefined)} lazy />
			</div>
			<span className='line-clamp-2 min-h-8 text-xs leading-4'>{item.title}</span>
			<span className='text-[10px] tabular-nums text-muted-foreground'>
				{formatScore(item.averageScore)}
				{listStatus ? `, ${listStatusShortLabel(listStatus)}` : ""}
			</span>
		</div>
	);
}

export function SeasonAltSkeleton({ viewAs }: { viewAs: SeasonAltView }): ReactNode {
	if (viewAs === "guide") {
		return (
			<ul className='divide-y border-b'>
				{["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"].map((id) => (
					<li key={id} className='h-16 bg-muted/40' />
				))}
			</ul>
		);
	}
	return (
		<ul className='grid grid-cols-4 items-end gap-2 px-3 pt-4 sm:grid-cols-6 lg:grid-cols-8'>
			{["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"].map((id, index) => (
				<li key={id} className='rounded-t-sm bg-muted/40' style={{ height: 72 + (index % 4) * 28 }} />
			))}
		</ul>
	);
}
