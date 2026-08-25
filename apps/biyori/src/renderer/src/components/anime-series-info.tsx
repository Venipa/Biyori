import { Separator } from "@/mainview/components/ui/separator";
import { cn } from "@/mainview/lib/utils";

export type AnimeSeriesInfoData = {
	alternativeTitles?: string;
	type: string;
	episodes: number;
	airingStatus: string;
	season: string;
	genres: string[];
	producers: string[];
	averageScore: number;
	synopsis?: string;
	yourScore?: number | null;
};

type AnimeSeriesInfoProps = {
	anime: AnimeSeriesInfoData;
	className?: string;
};

export function AnimeSeriesInfo({ anime, className }: AnimeSeriesInfoProps) {
	const genres = anime.genres ?? [];
	const producers = anime.producers ?? [];

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{anime.alternativeTitles != null ? (
				<section>
					<h3 className='mb-1 text-sm font-semibold'>Alternative titles</h3>
					<Separator className='mb-2' />
					<p className='text-sm leading-relaxed text-muted-foreground'>{anime.alternativeTitles || "-"}</p>
				</section>
			) : null}
			<section>
				<h3 className='mb-1 text-sm font-semibold'>Details</h3>
				<Separator className='mb-2' />
				<dl className='grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[8.5rem_1fr]'>
					<dt className='text-muted-foreground'>Type</dt>
					<dd>{anime.type || "-"}</dd>
					<dt className='text-muted-foreground'>Episodes</dt>
					<dd>{anime.episodes > 0 ? anime.episodes : "?"}</dd>
					<dt className='text-muted-foreground'>Status</dt>
					<dd className='text-primary'>{anime.airingStatus || "-"}</dd>
					<dt className='text-muted-foreground'>Season</dt>
					<dd className='text-primary'>{anime.season || "-"}</dd>
					<dt className='text-muted-foreground'>Genres</dt>
					<dd>{genres.join(", ") || "-"}</dd>
					<dt className='text-muted-foreground'>Producers</dt>
					<dd>{producers.join(", ") || "-"}</dd>
					<dt className='text-muted-foreground'>Score</dt>
					<dd>{anime.averageScore > 0 ? `${anime.averageScore}%` : "-"}</dd>
					{anime.yourScore !== undefined ? (
						<>
							<dt className='text-muted-foreground'>Your score</dt>
							<dd>{anime.yourScore != null ? String(anime.yourScore) : "-"}</dd>
						</>
					) : null}
				</dl>
			</section>
			{anime.synopsis != null ? (
				<section>
					<h3 className='mb-1 text-sm font-semibold'>Synopsis</h3>
					<Separator className='mb-2' />
					<p className='whitespace-pre-line text-sm leading-relaxed text-muted-foreground'>{anime.synopsis || "-"}</p>
				</section>
			) : null}
		</div>
	);
}
