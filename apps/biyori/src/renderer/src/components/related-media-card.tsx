import { desktopRpc } from "@/desktop-rpc";
import type { RelatedMedia } from "@/lib/schemas/related-media";
import { MangaCard } from "@/mainview/components/manga-card";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import type { AnimeInfoFrame } from "@/mainview/lib/anime-info-stack";

export function RelatedMediaSection({ items, from }: { items: RelatedMedia[]; from: Pick<AnimeInfoFrame, "title" | "coverUrl" | "season"> }) {
	const animeInfo = useAnimeInfoNav();
	if (items.length === 0) {
		return null;
	}
	return (
		<div className='flex flex-col gap-2 pb-3'>
			<h3 className='text-sm font-semibold'>Related</h3>
			<div className='grid grid-cols-3 gap-2 sm:grid-cols-4'>
				{items.map((item) => (
					<MangaCard
						key={`${item.mediaType}-${item.id}-${item.relationType}`}
						item={item}
						onOpen={() => {
							if (item.mediaType === "MANGA") {
								void desktopRpc.request.openExternal({ url: `https://anilist.co/manga/${item.id}` });
								return;
							}
							animeInfo.push(
								{
									id: item.id,
									infoTab: "main",
									title: item.title,
									coverUrl: item.coverUrl,
									viaRelation: item.relationType,
								},
								from,
							);
						}}
					/>
				))}
			</div>
		</div>
	);
}
