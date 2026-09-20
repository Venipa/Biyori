import { ExternalLinkIcon } from "lucide-react";
import { desktopRpc } from "@/desktop-rpc";
import { type RelatedMedia, relatedMediaLabel } from "@/lib/schemas/related-media";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import type { AnimeInfoFrame } from "@/mainview/lib/anime-info-stack";
import { cn } from "@/mainview/lib/utils";

type RelatedMediaCardProps = {
	item: RelatedMedia;
	onOpen: () => void;
};

function RelatedMediaCard({ item, onOpen }: RelatedMediaCardProps) {
	const meta = item.chapters != null && item.chapters > 0 ? `${item.format} · ${item.chapters} ch` : item.format;
	const isManga = item.mediaType === "MANGA";
	return (
		<button
			type='button'
			aria-label={isManga ? `${item.title}, opens in browser` : undefined}
			title={isManga ? `${item.title}, opens in browser` : `${item.title}\n${meta}`}
			className={cn(
				"flex w-full cursor-pointer flex-col overflow-hidden rounded-md border bg-card text-left ring-1 ring-transparent",
				"transition-shadow duration-150 hover:ring-foreground/15",
			)}
			onClick={onOpen}>
			<div className='relative aspect-2/3 w-full bg-muted'>
				<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt={item.title} className='size-full' lazy />
				<span className='absolute inset-x-0 top-0 bg-black/65 px-1.5 py-0.5 text-center text-[10px] font-medium text-white'>{relatedMediaLabel(item.relationType)}</span>
				{isManga ? (
					<span className='absolute right-1 bottom-1 rounded-sm bg-black/65 p-0.5 text-white'>
						<ExternalLinkIcon className='size-3' aria-hidden />
					</span>
				) : null}
			</div>
			<span className='line-clamp-2 px-1.5 pt-1.5 text-xs font-medium'>{item.title}</span>
			<span className='truncate px-1.5 pb-1.5 text-[10px] text-muted-foreground'>{meta}</span>
		</button>
	);
}

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
					<RelatedMediaCard
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
