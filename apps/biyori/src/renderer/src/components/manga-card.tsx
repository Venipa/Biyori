import { type RelatedMedia, relatedMediaLabel } from "@/lib/schemas/related-media";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { cn } from "@/mainview/lib/utils";

type MangaCardProps = {
	item: RelatedMedia;
	onOpen: () => void;
};

export function MangaCard({ item, onOpen }: MangaCardProps) {
	const meta = item.chapters != null && item.chapters > 0 ? `${item.format} · ${item.chapters} ch` : item.format;
	return (
		<button
			type='button'
			className={cn(
				"flex w-full cursor-pointer flex-col overflow-hidden rounded-md border bg-card text-left ring-1 ring-transparent",
				"transition-shadow duration-150 hover:ring-foreground/15",
			)}
			onClick={onOpen}>
			<div className='relative aspect-2/3 w-full bg-muted'>
				<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt={item.title} className='size-full' lazy />
				<span className='absolute inset-x-0 top-0 bg-black/65 px-1.5 py-0.5 text-center text-[10px] font-medium text-white'>{relatedMediaLabel(item.relationType)}</span>
			</div>
			<span className='line-clamp-2 px-1.5 pt-1.5 text-xs font-medium'>{item.title}</span>
			<span className='truncate px-1.5 pb-1.5 text-[10px] text-muted-foreground'>{meta}</span>
		</button>
	);
}
