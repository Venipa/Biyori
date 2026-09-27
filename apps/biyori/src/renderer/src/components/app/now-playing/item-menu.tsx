import { type ReactElement, useState } from "react";
import { AnimeItemCommands } from "@/mainview/components/app/anime-info/item-commands";
import { selectedFromContinue } from "@/mainview/components/app/now-playing/utils";
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
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import type { ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";

const commandParts = {
	Item: ContextMenuItem,
	Sub: ContextMenuSub,
	SubTrigger: ContextMenuSubTrigger,
	SubContent: ContextMenuSubContent,
	Separator: ContextMenuSeparator,
	Shortcut: ContextMenuShortcut,
};

export function IdleItemContextMenu({ item, playNextEnabled, render }: { item: ContinueWatchingItem; playNextEnabled: boolean; render: ReactElement }) {
	const [open, setOpen] = useState(false);
	const animeInfo = useAnimeInfoNav();
	return (
		<ContextMenu onOpenChange={setOpen}>
			<ContextMenuTrigger render={render} />
			<ContextMenuContent className='min-w-56'>
				{open ? (
					<AnimeItemCommands
						parts={commandParts}
						mode='now-playing'
						showPlayNext={playNextEnabled}
						anime={selectedFromContinue(item)}
						onEdit={() => {
							animeInfo.open({ id: item.animeId, infoTab: "list" });
						}}
					/>
				) : null}
			</ContextMenuContent>
		</ContextMenu>
	);
}
