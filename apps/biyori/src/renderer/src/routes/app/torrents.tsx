import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { TorrentFeed } from "@/mainview/components/app/torrents/feed";
import { CheckNewTorrentsButton, TorrentToolbar } from "@/mainview/components/app/torrents/toolbar";
import { Empty, EmptyDescription, EmptyTitle } from "@/mainview/components/ui/empty";
import { TableRowsSkeleton } from "@/mainview/components/ui/table-rows-skeleton";
import { trpc } from "@/mainview/trpc";

export const Route = createFileRoute("/app/torrents")({
	validateSearch: animeInfoSearchSchema,
	component: TorrentsPage,
});

function TorrentsPage(): ReactElement {
	const query = trpc.torrents.list.useQuery();
	const utils = trpc.useUtils();
	const items = query.data ?? [];
	trpc.torrents.onList.useSubscription(undefined, {
		onData: (next) => {
			utils.torrents.list.setData(undefined, next);
		},
	});

	return (
		<div className='flex h-full min-h-0 flex-col'>
			{items.length === 0 ? (
				<TorrentToolbar>
					<CheckNewTorrentsButton />
				</TorrentToolbar>
			) : null}
			{query.isPending && items.length === 0 ? (
				<TableRowsSkeleton columnCount={11} headers={["", "Anime title", "Episode", "Group", "Size", "Video", "S", "L", "D", "Filename", "Release date"]} />
			) : null}
			{items.length === 0 && !query.isLoading ? (
				<Empty>
					<EmptyTitle>No torrents found</EmptyTitle>
					<EmptyDescription>Matching torrents for your list will be listed here.</EmptyDescription>
				</Empty>
			) : null}
			{items.length > 0 ? <TorrentFeed key={items.map((item) => `${item.guid}:${item.state}`).join("|")} items={items} /> : null}
		</div>
	);
}
