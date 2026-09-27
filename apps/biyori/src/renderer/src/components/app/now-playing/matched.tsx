import { ExternalLinkIcon } from "lucide-react";
import { desktopRpc } from "@/desktop-rpc";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { AnimeScoreControl } from "@/mainview/components/app/anime-info/score-control";
import { AnimeSeriesInfo } from "@/mainview/components/app/anime-info/series-info";
import { AnimeStatusNotice } from "@/mainview/components/app/anime-info/status-notice";
import { formatNowPlayingLine, type NowPlayingSnapshot } from "@/mainview/components/app/now-playing/utils";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/mainview/components/ui/progress";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { nextEpisodeIsAvailable } from "@/mainview/lib/list-progress";
import { trpc } from "@/mainview/trpc";

export function MatchedPlayback({ snapshot }: { snapshot: NowPlayingSnapshot }) {
	const animeInfo = useAnimeInfoNav();
	const playNext = trpc.library.playNext.useMutation();
	const match = snapshot.match;
	const media = snapshot.media;
	const detailQuery = trpc.anime.byId.useQuery({ id: match?.id ?? 0 }, { enabled: Boolean(match?.id) });
	const libraryQuery = trpc.library.episodes.useQuery({ animeId: match?.id ?? 0 }, { enabled: Boolean(match?.id) });
	if (!match || !media) {
		return null;
	}
	const detail = detailQuery.data;

	const episode = snapshot.parsed?.episode;
	const group = snapshot.parsed?.group;
	const totalEpisodes = detail?.episodes ?? match.episodes;
	const total = totalEpisodes > 0 ? totalEpisodes : null;
	const watched = match.episodesWatched;
	const isMovie = detail?.type === "Movie";
	const currentEpisode = episode ?? watched;
	const nextEpisode = currentEpisode + 1;
	const lastAiredEpisode = detail?.lastAiredEpisode ?? match.lastAiredEpisode;
	const canWatchNext =
		!isMovie &&
		nextEpisodeIsAvailable({
			nextEpisode,
			totalEpisodes: total,
			lastAiredEpisode,
			libraryEpisodes: libraryQuery.data?.map((row) => row.episode),
		});
	const progressValue = total != null && total > 0 ? Math.min(100, Math.round((watched / total) * 100)) : 80;
	const nowPlayingLine = formatNowPlayingLine(episode, group, isMovie);
	const title = detail?.title ?? match.title;
	const status = match.status;
	const rewatching = match.rewatching;
	const airingStatus = detail?.airingStatus ?? match.airingStatus;

	return (
		<div className='pb-10'>
			<div className='relative h-44 w-full overflow-hidden bg-muted'>
				{detail?.bannerUrl || match.bannerUrl ? (
					<AnimeCover id={match.id} kind='banner' sourceUrl={detail?.bannerUrl || match.bannerUrl} alt='' className='size-full object-cover' />
				) : null}
				{/* Scrim + fades: keep title readable on light/dark banners */}
				<div aria-hidden className='pointer-events-none absolute inset-0 bg-background/45' />
				<div aria-hidden className='pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/20' />
				<div aria-hidden className='pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-background/50 to-transparent' />
			</div>

			<div className='relative z-10 -mt-16 grid grid-cols-[14rem_1fr] items-start gap-x-4 gap-y-3 px-4'>
				<div className='row-span-2 flex min-w-0 flex-col gap-2'>
					<div className='aspect-2/3 w-full overflow-hidden rounded-md border bg-muted shadow-md ring-1 ring-foreground/10'>
						<AnimeCover
							id={match.id}
							coverUrl={detail?.coverUrl || match.coverUrl || undefined}
							alt={`Key art for ${title}`}
							width={224}
							height={336}
							className='size-full object-cover'
						/>
					</div>
					{detail ? (
						<AnimeStatusNotice
							surface='nowPlaying'
							anime={{
								airingStatus: detail.airingStatus,
								lastAiredEpisode: detail.lastAiredEpisode,
								nextAiringAt: detail.nextAiringAt,
								endDate: detail.endDate,
								ratedRank: detail.ratedRank,
								popularRank: detail.popularRank,
							}}
						/>
					) : null}
				</div>

				<div className='flex min-h-16 min-w-0 flex-col justify-end gap-1 py-2'>
					<p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Now playing</p>
					<h1 className='text-balance text-lg font-semibold text-foreground sm:text-xl'>{title}</h1>
					<p className='text-sm text-muted-foreground'>{nowPlayingLine}</p>
				</div>

				<div className='flex min-w-0 flex-col gap-4'>
					<div className='flex flex-wrap items-center gap-1.5'>
						{status ? <Badge variant='secondary'>{status}</Badge> : null}
						{rewatching ? <Badge variant='outline'>Rewatching</Badge> : null}
						<Badge variant='outline'>{media.player}</Badge>
						{airingStatus ? <Badge variant='outline'>{airingStatus}</Badge> : null}
						{snapshot.delayRemainingSeconds > 0 ? <Badge variant='outline'>Updating in {snapshot.delayRemainingSeconds}s</Badge> : null}
						{snapshot.pendingConfirm ? <Badge>Confirm update</Badge> : null}
					</div>

					{progressValue != null ? (
						<Progress value={progressValue} className='w-full max-w-48'>
							<ProgressLabel>Progress</ProgressLabel>
							<ProgressValue>{() => (total != null ? `${watched} / ${total}` : `${watched} / ?`)}</ProgressValue>
						</Progress>
					) : (
						<p className='text-sm text-muted-foreground tabular-nums'>
							Progress {watched}
							{total ? ` / ${total}` : " / unknown"}
						</p>
					)}

					<div className='flex flex-wrap gap-2'>
						<Button
							type='button'
							variant='secondary'
							size='sm'
							onClick={() => {
								animeInfo.open({ id: match.id, infoTab: "list" });
							}}>
							Edit list
						</Button>
						{canWatchNext ? (
							<Button
								type='button'
								size='sm'
								disabled={playNext.isPending}
								onClick={() => {
									void playNext.mutateAsync({
										animeId: match.id,
										episodesWatched: currentEpisode,
									});
								}}>
								Watch next episode
							</Button>
						) : null}
						<AnimeScoreControl
							animeId={match.id}
							score={detail?.score ?? match.score}
							status={status ?? ""}
							progress={watched}
							notes={match.notes}
							rewatching={rewatching}
							timesRewatched={match.timesRewatched}
							dateStarted={match.dateStarted}
							dateCompleted={match.dateCompleted}
						/>
						<Button
							type='button'
							variant='ghost'
							size='sm'
							onClick={() => {
								void desktopRpc.request.openExternal({
									url: `https://anilist.co/anime/${match.id}`,
								});
							}}>
							AniList
							<ExternalLinkIcon data-icon='inline-end' />
						</Button>
					</div>

					{detailQuery.isLoading && !detail ? (
						<div className='flex flex-col gap-3'>
							<Skeleton className='h-4 w-32' />
							<Skeleton className='h-24 w-full' />
							<Skeleton className='h-4 w-24' />
							<Skeleton className='h-20 w-full' />
						</div>
					) : (
						<AnimeSeriesInfo
							anime={{
								title: detail?.title ?? match.title,
								titles: detail?.titles ?? match.titles,
								type: detail?.type ?? match.type ?? "",
								episodes: detail?.episodes ?? match.episodes,
								airingStatus: detail?.airingStatus ?? match.airingStatus ?? "",
								season: detail?.season ?? match.season ?? "",
								genres: detail?.genres ?? match.genres ?? [],
								tags: detail?.tags ?? [],
								producers: detail?.producers ?? match.producers ?? [],
								averageScore: detail?.averageScore ?? match.averageScore ?? 0,
								synopsis: detail?.synopsis ?? match.synopsis ?? "",
								yourScore: detail?.score ?? match.score,
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
