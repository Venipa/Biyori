import { t, useTranslation } from "@biyori/translations/react";
import type * as React from "react";
import { formatScore } from "@/lib/anilist-score";
import type { StoredAnimeTitles } from "@/lib/anime-titles";
import { Badge } from "@/mainview/components/ui/badge";
import { Separator } from "@/mainview/components/ui/separator";
import { useAnilistScoreFormat } from "@/mainview/lib/anilist-score-format";
import { airingStatusLabel } from "@/mainview/lib/anime-airing-notice";
import { animeTypeLabel, genreLabel } from "@/mainview/lib/anime-list-filter";
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
	/** weekly slot from providers without exact airing times */
	broadcast?: string | null;
	producers: string[];
	averageScore: number;
	synopsis?: string;
	yourScore?: number | null;
};

type AnimeSeriesInfoProps = {
	anime: AnimeSeriesInfoData;
	className?: string;
	/** narrow label column; a value that does not fit beside its label drops to its own line */
	compact?: boolean;
};

/** Grid mode keeps the pair as direct grid cells (`contents`); compact mode wraps the value under the label only when it overflows. */
function DetailRow({ label, compact, className, children }: { label: string; compact?: boolean; className?: string; children: React.ReactNode }) {
	return (
		<div className={compact ? "flex flex-wrap gap-x-3" : "contents"}>
			<dt className={cn("text-muted-foreground", compact && "w-18 shrink-0")}>{label}</dt>
			<dd className={cn(compact && "min-w-0 flex-auto", className)}>{children}</dd>
		</div>
	);
}

const TITLE_FORMATS = [
	{ language: "Romaji", key: "romaji" },
	{ language: "English", key: "english" },
	{ language: "Native", key: "native" },
] as const;

function titleLanguageLabel(language: string): string {
	switch (language) {
		case "Romaji":
			return t("anime.romaji");
		case "English":
			return t("anime.english");
		case "Native":
			return t("anime.native");
		default:
			return language;
	}
}

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

export function AnimeSeriesInfo({ anime, className, compact = false }: AnimeSeriesInfoProps) {
	const { t } = useTranslation();
	const scoreFormat = useAnilistScoreFormat();
	const genres = anime.genres ?? [];
	const tags = anime.tags ?? [];
	const producers = anime.producers ?? [];
	const altTitles = formatTitleBadges(anime);

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{altTitles.length > 0 ? (
				<section>
					<h3 className='mb-1 text-sm font-semibold'>{t("anime.alternativeTitles")}</h3>
					<Separator className='mb-2' />
					<div className='flex flex-wrap gap-1'>
						{altTitles.map((item) => (
							<Badge key={`${item.language}:${item.title}`} variant='secondary' className='h-auto max-w-full whitespace-normal select-text'>
								{item.language ? <span className='text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'>{titleLanguageLabel(item.language)}</span> : null}
								<span className='select-text'>{item.title}</span>
							</Badge>
						))}
					</div>
				</section>
			) : null}
			<section>
				<h3 className='mb-1 text-sm font-semibold'>{t("anime.details")}</h3>
				<Separator className='mb-2' />
				<dl className={compact ? "flex flex-col gap-y-1.5 text-sm" : "grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[8.5rem_1fr]"}>
					<DetailRow compact={compact} label={t("list.type")}>
						{anime.type ? animeTypeLabel(anime.type) : "-"}
					</DetailRow>
					<DetailRow compact={compact} label={t("anime.episodes")}>
						{anime.episodes > 0 ? anime.episodes : t("seasons.unknownMark")}
					</DetailRow>
					<DetailRow compact={compact} label={t("anime.status")} className='text-primary'>
						{anime.airingStatus ? airingStatusLabel(anime.airingStatus) : "-"}
					</DetailRow>
					<DetailRow compact={compact} label={t("anime.season")} className='text-primary'>
						{anime.season || "-"}
					</DetailRow>
					<DetailRow compact={compact} label={t("anime.genres")}>
						{genres.map((genre) => genreLabel(genre)).join(", ") || "-"}
					</DetailRow>
					{tags.length > 0 ? (
						<DetailRow compact={compact} label={t("anime.tags")}>
							{tags.join(", ")}
						</DetailRow>
					) : null}
					{anime.broadcast ? (
						<DetailRow compact={compact} label={t("anime.broadcast")}>
							{anime.broadcast}
						</DetailRow>
					) : null}
					<DetailRow compact={compact} label={t("anime.producers")}>
						{producers.join(", ") || "-"}
					</DetailRow>
					<DetailRow compact={compact} label={t("anime.score")}>
						{anime.averageScore > 0 ? `${anime.averageScore}%` : "-"}
					</DetailRow>
					{anime.yourScore !== undefined ? (
						<DetailRow compact={compact} label={t("anime.yourScore")}>
							{formatScore(anime.yourScore, scoreFormat)}
						</DetailRow>
					) : null}
				</dl>
			</section>
			{anime.synopsis != null ? (
				<section>
					<h3 className='mb-1 text-sm font-semibold'>{t("anime.synopsis")}</h3>
					<Separator className='mb-2' />
					<p className='cursor-text select-text whitespace-pre-line text-sm leading-relaxed text-muted-foreground'>{anime.synopsis || "-"}</p>
				</section>
			) : null}
		</div>
	);
}
