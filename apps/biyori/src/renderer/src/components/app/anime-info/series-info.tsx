import type { StoredAnimeTitles } from "@/lib/anime-titles";
import { Badge } from "@/mainview/components/ui/badge";
import { Separator } from "@/mainview/components/ui/separator";
import { cn } from "@/mainview/lib/utils";

export type AnimeSeriesInfoData = {
	title?: string;
	titles?: StoredAnimeTitles;
	type: string;
	episodes: number;
	airingStatus: string;
	season: string;
	genres: string[];
	tags?: string[];
	producers: string[];
	averageScore: number;
	synopsis?: string;
	yourScore?: number | null;
};

type AnimeSeriesInfoProps = {
	anime: AnimeSeriesInfoData;
	className?: string;
};

const TITLE_FORMATS = [
	{ language: "Romaji", key: "romaji" },
	{ language: "English", key: "english" },
	{ language: "Native", key: "native" },
] as const;

function formatTitleBadges(anime: AnimeSeriesInfoData): Array<{ language: string; title: string }> {
	const preferred = anime.title?.trim() ?? "";
	const seen = new Set(preferred ? [preferred.toLowerCase()] : []);
	const badges: Array<{ language: string; title: string }> = [];
	if (anime.titles) {
		for (const format of TITLE_FORMATS) {
			const title = anime.titles[format.key].trim();
			if (!title || seen.has(title.toLowerCase())) {
				continue;
			}
			seen.add(title.toLowerCase());
			badges.push({ language: format.language, title });
		}
		for (const title of anime.titles.synonyms) {
			const trimmed = title.trim();
			if (!trimmed || seen.has(trimmed.toLowerCase())) {
				continue;
			}
			seen.add(trimmed.toLowerCase());
			badges.push({ language: "", title: trimmed });
		}
	}
	return badges;
}

export function AnimeSeriesInfo({ anime, className }: AnimeSeriesInfoProps) {
	const genres = anime.genres ?? [];
	const tags = anime.tags ?? [];
	const producers = anime.producers ?? [];
	const altTitles = formatTitleBadges(anime);

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{altTitles.length > 0 ? (
				<section>
					<h3 className='mb-1 text-sm font-semibold'>Alternative titles</h3>
					<Separator className='mb-2' />
					<div className='flex flex-wrap gap-1'>
						{altTitles.map((item) => (
							<Badge key={`${item.language}:${item.title}`} variant='secondary' className='h-auto max-w-full whitespace-normal select-text'>
								{item.language ? <span className='text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'>{item.language}</span> : null}
								<span className='select-text'>{item.title}</span>
							</Badge>
						))}
					</div>
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
					<dt className='text-muted-foreground'>Tags</dt>
					<dd>{tags.join(", ") || "-"}</dd>
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
					<p className='cursor-text select-text whitespace-pre-line text-sm leading-relaxed text-muted-foreground'>{anime.synopsis || "-"}</p>
				</section>
			) : null}
		</div>
	);
}
