import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { AnimeSeriesInfo } from "@/mainview/components/anime-series-info";
import { PlaceholderView } from "@/mainview/components/placeholder-view";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/mainview/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/mainview/components/ui/progress";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Separator } from "@/mainview/components/ui/separator";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { CircleAlertIcon, CircleHelpIcon, ExternalLinkIcon, PlayCircleIcon, SearchIcon } from "lucide-react";

export const Route = createFileRoute("/app/now-playing")({
	validateSearch: animeInfoSearchSchema,
	component: NowPlayingPage,
});

type NowPlayingSnapshot = NonNullable<inferRouterOutputs<AppRouter>["media"]["nowPlaying"]>;

type HistoryRow = inferRouterOutputs<AppRouter>["history"]["list"]["history"][number];
type ListedRow = inferRouterOutputs<AppRouter>["anime"]["listed"][number];
type ContinueWatchingItem = {
	animeId: number;
	title: string;
	nextEpisode: number;
	coverUrl?: string;
	type?: string;
	episodes?: number;
};
type UpcomingItem = {
	id: number;
	title: string;
};

const CONTINUE_WATCHING_LIMIT = 20;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function NowPlayingPage() {
	const query = trpc.media.nowPlaying.useQuery();
	const snapshot = query.data;

	if (query.isPending && !snapshot) {
		return <NowPlayingSkeleton />;
	}

	if (!snapshot?.media) {
		return <IdleNowPlaying />;
	}

	return (
		<ScrollArea className='h-full'>
			{snapshot.unrecognized || !snapshot.match ? (
				<div className='mx-auto flex w-full flex-col gap-6 p-4 pb-10'>
					<UnrecognizedPlayback snapshot={snapshot} />
				</div>
			) : (
				<MatchedPlayback snapshot={snapshot} />
			)}
		</ScrollArea>
	);
}

function IdleNowPlaying() {
	const historyQuery = trpc.history.list.useQuery();
	const listedQuery = trpc.anime.listed.useQuery();
	const playNext = trpc.library.playNext.useMutation();
	const animeInfo = useAnimeInfoNav();
	const queued = historyQuery.data?.queued ?? [];
	const history = historyQuery.data?.history ?? [];
	const listed = listedQuery.data ?? [];
	const listedById = new Map(listed.map((row) => [row.id, row]));
	const skipStatus = new Set(listed.filter((row) => row.status === "Completed" || row.status === "Dropped").map((row) => row.id));
	const continueWatching = buildContinueWatching([...queued, ...history], listedById, skipStatus);
	const upcoming = buildUpcoming(listed, skipStatus);
	const watchedLastWeek = countWatchedLastWeek([...queued, ...history]);
	const historyPending = historyQuery.isPending && !historyQuery.data;
	const listedPending = listedQuery.isPending && !listedQuery.data;

	if (historyPending || listedPending) {
		return <NowPlayingSkeleton />;
	}

	if (continueWatching.length === 0 && upcoming.length === 0) {
		return <PlaceholderView icon={PlayCircleIcon} title='Nothing is playing' description="Episodes you're currently watching will show up here." />;
	}

	return (
		<ScrollArea className='h-full'>
			<div className='@container mx-auto flex w-full flex-col gap-6 p-4 pb-10'>
				<header className='flex flex-col gap-1'>
					<p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Now playing</p>
					<h1 className='text-xl font-semibold tracking-tight'>Nothing is playing</h1>
					<p className='text-sm text-muted-foreground'>Continue from recent list updates.</p>
				</header>

				{continueWatching.length > 0 ? (
					<section className='flex flex-col gap-3'>
						<div>
							<h2 className='mb-1 text-sm font-semibold'>Continue watching</h2>
							<Separator className='mb-2' />
							<ul
								aria-label='Continue watching'
								className='flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]'>
								{continueWatching.map((item) => (
									<li key={item.animeId} className='w-[200px] shrink-0 snap-start'>
										<ContinueWatchingCard
											item={item}
											disabled={playNext.isPending}
											onPlay={() => {
												void playNext.mutateAsync({
													animeId: item.animeId,
													episodesWatched: item.nextEpisode - 1,
												});
											}}
										/>
									</li>
								))}
							</ul>
						</div>
						{watchedLastWeek > 0 ? (
							<p className='text-sm text-muted-foreground'>
								You've watched {watchedLastWeek} episode
								{watchedLastWeek === 1 ? "" : "s"} last week.
							</p>
						) : null}
					</section>
				) : null}

				{upcoming.length > 0 ? (
					<section>
						<h2 className='mb-1 text-sm font-semibold'>Upcoming</h2>
						<Separator className='mb-2' />
						<div className='flex flex-wrap gap-1.5'>
							{upcoming.map((item) => (
								<Button
									key={item.id}
									type='button'
									size='sm'
									variant='outline'
									onClick={() => {
										animeInfo.open({ id: item.id, infoTab: "main" });
									}}>
									{item.title}
								</Button>
							))}
						</div>
					</section>
				) : null}
			</div>
		</ScrollArea>
	);
}

function ContinueWatchingCard({ item, disabled, onPlay }: { item: ContinueWatchingItem; disabled: boolean; onPlay: () => void }) {
	const total = item.episodes != null && item.episodes > 0 ? item.episodes : null;
	return (
		<Card size='sm' className='overflow-hidden py-0'>
			<Button
				type='button'
				variant='ghost'
				className='h-auto w-full min-w-0 flex-col items-stretch p-0 text-left font-normal whitespace-normal'
				disabled={disabled}
				onClick={onPlay}>
				<span className='relative block aspect-square h-[200px] w-full overflow-hidden bg-muted'>
					<AnimeCover id={item.animeId} kind='cover' coverUrl={item.coverUrl} alt='' lazy className='size-full' />
				</span>
				<CardHeader className='flex flex-col items-stretch gap-0.5 p-2'>
					<CardTitle className='truncate'>{item.title}</CardTitle>
					<CardDescription className='truncate'>
						Next episode {item.nextEpisode}
						{total != null ? ` of ${total}` : ""}
					</CardDescription>
					{item.type ? (
						<div className='flex flex-wrap gap-1'>
							<Badge variant='outline'>{item.type}</Badge>
						</div>
					) : null}
				</CardHeader>
			</Button>
		</Card>
	);
}

function MatchedPlayback({ snapshot }: { snapshot: NowPlayingSnapshot }) {
	const animeInfo = useAnimeInfoNav();
	const playNext = trpc.library.playNext.useMutation();
	const match = snapshot.match;
	const media = snapshot.media;
	const detailQuery = trpc.anime.byId.useQuery({ id: match?.id ?? 0 }, { enabled: Boolean(match?.id) });
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
	const canWatchNext = !isMovie && (total == null || nextEpisode <= total);
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
				<div className='row-span-2 aspect-2/3 w-56 shrink-0 overflow-hidden rounded-md border bg-muted shadow-md ring-1 ring-foreground/10'>
					<AnimeCover
						id={match.id}
						coverUrl={detail?.coverUrl || match.coverUrl || undefined}
						alt={`Key art for ${title}`}
						width={224}
						height={336}
						className='size-full object-cover'
					/>
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
						<Button type='button' variant='ghost' size='sm' render={<a href={`https://anilist.co/anime/${match.id}`} target='_blank' rel='noreferrer noopener' />}>
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
								alternativeTitles: detail?.alternativeTitles ?? match.alternativeTitles ?? "",
								type: detail?.type ?? match.type ?? "",
								episodes: detail?.episodes ?? match.episodes,
								airingStatus: detail?.airingStatus ?? match.airingStatus ?? "",
								season: detail?.season ?? match.season ?? "",
								genres: detail?.genres ?? match.genres ?? [],
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

function UnrecognizedPlayback({ snapshot }: { snapshot: NowPlayingSnapshot }) {
	const navigate = useNavigate();
	const animeInfo = useAnimeInfoNav();
	const utils = trpc.useUtils();
	const chooseMatch = trpc.media.chooseMatch.useMutation({
		onSuccess: () => {
			void utils.media.nowPlaying.invalidate();
			void utils.anime.list.invalidate();
			void utils.anime.listed.invalidate();
		},
	});
	const title = snapshot.parsed?.title ?? snapshot.media?.title ?? "Unknown title";
	const episode = snapshot.parsed?.episode;
	const group = snapshot.parsed?.group;
	const searchQuery = title.trim();
	const similar = snapshot.similar ?? [];

	return (
		<>
			<header className='flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-start'>
				<div className='flex size-28 shrink-0 items-center justify-center rounded-lg bg-muted ring-1 ring-border/60 sm:size-32'>
					<PlayCircleIcon className='size-10 text-muted-foreground' />
				</div>
				<div className='flex min-w-0 flex-1 flex-col gap-3'>
					<div className='flex flex-col gap-1.5'>
						<p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Now playing</p>
						<h1 className='text-balance text-xl font-semibold tracking-tight sm:text-2xl'>{title}</h1>
						<p className='text-sm text-muted-foreground'>{formatNowPlayingLine(episode, group)}</p>
					</div>
					<div className='flex flex-wrap items-center gap-1.5'>
						<Badge variant='destructive'>Not recognized</Badge>
						{snapshot.media ? <Badge variant='outline'>{snapshot.media.player}</Badge> : null}
					</div>
				</div>
			</header>

			<Alert variant='destructive'>
				<CircleAlertIcon />
				<AlertTitle>Unable to match this title</AlertTitle>
				<AlertDescription>
					{similar.length > 0
						? "Biyori could not identify this episode. Choose the correct anime from the list below, or search AniList."
						: "Biyori could not identify this episode against your list. Search AniList and add it, or check the filename."}
				</AlertDescription>
				{searchQuery ? (
					<AlertAction>
						<Button
							type='button'
							size='sm'
							variant='outline'
							onClick={() => {
								void navigate({
									to: "/app/search",
									search: { q: searchQuery },
								});
							}}>
							<SearchIcon data-icon='inline-start' />
							Search
						</Button>
					</AlertAction>
				) : null}
			</Alert>

			{similar.length > 0 ? (
				<section className='flex flex-col gap-2'>
					<h2 className='text-sm font-semibold'>Similar titles</h2>
					<Separator />
					<ul className='flex flex-col gap-2'>
						{similar.map((item) => (
							<li key={item.id}>
								<SimilarTitleCard
									item={item}
									disabled={chooseMatch.isPending}
									onChoose={() => {
										void chooseMatch.mutateAsync({ animeId: item.id });
									}}
									onInfo={() => {
										animeInfo.open({ id: item.id, infoTab: "list" });
									}}
								/>
							</li>
						))}
					</ul>
				</section>
			) : null}

			{snapshot.media?.filePath || snapshot.parsed?.filePath ? (
				<div>
					<h2 className='mb-1 text-sm font-semibold'>Source</h2>
					<Separator className='mb-2' />
					<p className='break-all font-mono text-xs text-muted-foreground'>{snapshot.media?.filePath ?? snapshot.parsed?.filePath}</p>
				</div>
			) : null}
		</>
	);
}

function SimilarTitleCard({
	item,
	disabled,
	onChoose,
	onInfo,
}: {
	item: NonNullable<NowPlayingSnapshot["similar"]>[number];
	disabled: boolean;
	onChoose: () => void;
	onInfo: () => void;
}) {
	return (
		<Card size='sm' className='py-0'>
			<div className='flex items-stretch'>
				<Button
					type='button'
					variant='ghost'
					className='h-auto min-w-0 flex-1 items-center justify-start gap-3 rounded-xl px-2 py-2 text-left font-normal'
					disabled={disabled}
					onClick={onChoose}>
					<AnimeCover id={item.id} coverUrl={item.coverUrl || undefined} alt='' lazy width={40} height={60} className='aspect-2/3 w-10 shrink-0 overflow-hidden rounded-md bg-muted' />
					<span className='flex min-w-0 flex-col gap-0.5'>
						<span className='truncate text-sm font-medium'>{item.title}</span>
						{item.type ? <span className='text-xs text-muted-foreground'>{item.type}</span> : null}
					</span>
				</Button>
				<Button type='button' variant='ghost' size='icon' className='m-1 shrink-0 self-center' aria-label={`Open ${item.title}`} disabled={disabled} onClick={onInfo}>
					<CircleHelpIcon />
				</Button>
			</div>
		</Card>
	);
}

function buildContinueWatching(
	rows: HistoryRow[],
	listedById: ReadonlyMap<number, ListedRow>,
	skipAnimeIds: ReadonlySet<number>,
): ContinueWatchingItem[] {
	const seen = new Set<number>();
	const items: ContinueWatchingItem[] = [];
	for (const row of rows) {
		if (row.animeId <= 0 || row.episode <= 0 || seen.has(row.animeId) || skipAnimeIds.has(row.animeId)) {
			continue;
		}
		seen.add(row.animeId);
		const listed = listedById.get(row.animeId);
		items.push({
			animeId: row.animeId,
			title: listed?.title ?? row.title,
			nextEpisode: row.episode + 1,
			coverUrl: listed?.coverUrl,
			type: listed?.type,
			episodes: listed?.episodes,
		});
		if (items.length >= CONTINUE_WATCHING_LIMIT) {
			break;
		}
	}
	return items;
}

function buildUpcoming(listed: ListedRow[], skipAnimeIds: ReadonlySet<number>): UpcomingItem[] {
	const items: UpcomingItem[] = [];
	for (const row of listed) {
		if (row.airingStatus !== "Not yet released" || skipAnimeIds.has(row.id)) {
			continue;
		}
		items.push({ id: row.id, title: row.title });
	}
	return items.toSorted((a, b) => a.title.localeCompare(b.title));
}

function countWatchedLastWeek(rows: HistoryRow[]): number {
	const cutoff = Date.now() - WEEK_MS;
	let count = 0;
	for (const row of rows) {
		if (row.episode <= 0) {
			continue;
		}
		const time = Date.parse(row.lastModified);
		if (!Number.isNaN(time) && time >= cutoff) {
			count += 1;
		}
	}
	return count;
}

function formatNowPlayingLine(episode: number | null | undefined, group: string | null | undefined, isMovie: boolean = false): string {
	if (isMovie) {
		return "Movie";
	}
	const episodePart = episode != null ? `Episode ${episode}` : "Episode unknown";
	if (group) {
		return `${episodePart} by ${group}`;
	}
	return episodePart;
}

function NowPlayingSkeleton() {
	return (
		<ScrollArea className='h-full min-h-0'>
			<div className='mx-auto flex w-full flex-col gap-6 p-4'>
				<div className='flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-end'>
					<Skeleton className='aspect-2/3 w-28 shrink-0 rounded-lg sm:w-32' />
					<div className='flex min-w-0 flex-1 flex-col gap-3'>
						<Skeleton className='h-3 w-24' />
						<Skeleton className='h-7 w-2/3' />
						<Skeleton className='h-4 w-40' />
						<div className='flex gap-2'>
							<Skeleton className='h-5 w-24 rounded-full' />
							<Skeleton className='h-5 w-16 rounded-full' />
						</div>
						<Skeleton className='h-4 w-48' />
					</div>
				</div>
				<div className='flex flex-col gap-2'>
					<Skeleton className='h-4 w-20' />
					<Skeleton className='h-24 w-full' />
				</div>
			</div>
		</ScrollArea>
	);
}
