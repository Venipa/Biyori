import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { CircleAlertIcon, CircleHelpIcon, ExternalLinkIcon, LayoutGridIcon, PlayCircleIcon, SearchIcon, Table2Icon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { desktopRpc } from "@/desktop-rpc";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import { type NowPlayingView } from "@/lib/schemas/app-settings";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { AnimeSeriesInfo } from "@/mainview/components/anime-series-info";
import { PlaceholderView } from "@/mainview/components/placeholder-view";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Card } from "@/mainview/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/mainview/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/mainview/components/ui/table";
import { ToggleRadio, ToggleRadioItem } from "@/mainview/components/ui/toggle-radio";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { Separator } from "@/mainview/components/ui/separator";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { formatClock } from "@/mainview/lib/format-date";
import { nextEpisodeIsAvailable } from "@/mainview/lib/list-progress";
import { buildAiringSoon, buildContinueWatching, buildUpcoming, type AiringSoonGroup, type ContinueWatchingItem, SEVEN_DAYS_MS } from "@/mainview/lib/now-playing-idle";
import { trpc } from "@/mainview/trpc";
import type { AppRouter } from "@/shared/app-router";

export const Route = createFileRoute("/app/now-playing")({
	validateSearch: animeInfoSearchSchema,
	component: NowPlayingPage,
});

type NowPlayingSnapshot = NonNullable<inferRouterOutputs<AppRouter>["media"]["nowPlaying"]>;

type HistoryRow = inferRouterOutputs<AppRouter>["history"]["list"]["history"][number];

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
	const settingsQuery = trpc.settings.get.useQuery();
	const utils = trpc.useUtils();
	const setSettings = trpc.settings.set.useMutation({
		onSuccess: (settings) => {
			utils.settings.get.setData(undefined, settings);
		},
	});
	const playNext = trpc.library.playNext.useMutation();
	const animeInfo = useAnimeInfoNav();
	const layout = settingsQuery.data?.nowPlayingView ?? "cards";
	function setLayout(next: NowPlayingView) {
		const current = utils.settings.get.getData();
		if (current) {
			utils.settings.get.setData(undefined, { ...current, nowPlayingView: next });
		}
		void setSettings.mutateAsync({ nowPlayingView: next });
	}
	const queued = historyQuery.data?.queued ?? [];
	const history = historyQuery.data?.history ?? [];
	const listed = listedQuery.data ?? [];
	const listedById = new Map(listed.map((row) => [row.id, row]));
	const skipStatus = new Set(listed.filter((row) => row.status === "Completed" || row.status === "Dropped").map((row) => row.id));
	const continueWatching = buildContinueWatching([...queued, ...history], listedById, skipStatus);
	const airingSkip = new Set([...skipStatus, ...continueWatching.map((item) => item.animeId)]);
	const airing = buildAiringSoon(listed, airingSkip, Date.now());
	const airingIds = airing.flatMap((group) => group.items.map((item) => item.animeId));
	const upcomingSkip = new Set([...skipStatus, ...airingIds]);
	const upcoming = buildUpcoming(listed, upcomingSkip);
	const watchedLastWeek = countWatchedLastWeek([...queued, ...history]);
	const historyPending = historyQuery.isPending && !historyQuery.data;
	const listedPending = listedQuery.isPending && !listedQuery.data;
	const hasAiring = airing.length > 0;

	if (historyPending || listedPending) {
		return <NowPlayingSkeleton />;
	}

	if (continueWatching.length === 0 && !hasAiring && upcoming.length === 0) {
		return <PlaceholderView icon={PlayCircleIcon} title='Nothing is playing' description="Episodes you're currently watching will show up here." />;
	}

	return (
		<ScrollArea className='h-full'>
			<div className='@container mx-auto flex w-full flex-col gap-6 p-4 pb-10'>
				<header className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
					<div className='flex flex-col gap-1'>
						<p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Now playing</p>
						<h1 className='text-xl font-semibold tracking-tight'>Nothing is playing</h1>
						<p className='text-sm text-muted-foreground'>Continue from recent list updates.</p>
					</div>
					{continueWatching.length > 0 || hasAiring ? (
						<IdleLayoutToggle value={layout} onValueChange={setLayout} />
					) : null}
				</header>

				{layout === "table" ? (
					<IdleTables
						continueWatching={continueWatching}
						airing={airing}
						playDisabled={playNext.isPending}
						onPlay={(item) => {
							void playNext.mutateAsync({
								animeId: item.animeId,
								episodesWatched: item.nextEpisode - 1,
							});
						}}
						onOpen={(item) => {
							animeInfo.open({ id: item.animeId, infoTab: "main" });
						}}
						watchedLastWeek={watchedLastWeek}
					/>
				) : continueWatching.length > 0 || hasAiring ? (
					<div className='flex min-w-0 gap-3'>
						{continueWatching.length > 0 ? (
							<section className='flex w-fit min-w-0 max-w-1/2 flex-col gap-3'>
								<div className='min-w-0 max-w-full'>
									<h2 className='mb-1 text-sm font-semibold'>Continue watching</h2>
									<Separator className='mb-2' />
									<IdlePosterStrip
										label='Continue watching'
										items={continueWatching}
										disabled={playNext.isPending}
										onActivate={(item) => {
											void playNext.mutateAsync({
												animeId: item.animeId,
												episodesWatched: item.nextEpisode - 1,
											});
										}}
									/>
								</div>
								{watchedLastWeek > 0 ? (
									<p className='text-sm text-muted-foreground'>
										You've watched {watchedLastWeek} episode
										{watchedLastWeek === 1 ? "" : "s"} last week.
									</p>
								) : null}
							</section>
						) : null}
						{hasAiring ? (
							<section className='min-w-0 flex-1'>
								<IdleAiringRail
									groups={airing.map((group) => ({
										label: group.label,
										items: group.items,
										onActivate: (item: ContinueWatchingItem) => {
											animeInfo.open({ id: item.animeId, infoTab: "main" });
										},
									}))}
								/>
							</section>
						) : null}
					</div>
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

function airingCaption(item: ContinueWatchingItem): string {
	return `Episode ${item.nextEpisode} at ${formatClock(item.nextAiringAt)}`;
}

function IdleLayoutToggle({ value, onValueChange }: { value: NowPlayingView; onValueChange: (value: NowPlayingView) => void }) {
	return (
		<ToggleRadio
			aria-label='View'
			value={value}
			onValueChange={(next) => {
				if (next === "cards" || next === "table") {
					onValueChange(next);
				}
			}}>
			<ToggleRadioItem value='cards'>
				<LayoutGridIcon data-icon='inline-start' />
				Cards
			</ToggleRadioItem>
			<ToggleRadioItem value='table'>
				<Table2Icon data-icon='inline-start' />
				Table
			</ToggleRadioItem>
		</ToggleRadio>
	);
}

function TitleCellWithPoster({ item }: { item: ContinueWatchingItem }) {
	return (
		<TableCell className='group/poster relative w-full max-w-64 overflow-visible'>
			<span className='pointer-events-none invisible absolute top-1/2 left-full z-30 ml-2 -translate-y-1/2 group-hover/poster:visible'>
				<AnimeCover
					id={item.animeId}
					kind='cover'
					coverUrl={item.coverUrl}
					alt=''
					width={96}
					height={144}
					className='aspect-2/3 h-36 w-24 overflow-hidden rounded-md bg-muted shadow-md ring-1 ring-foreground/10'
				/>
			</span>
			<span className='block w-full min-w-0 truncate'>{item.title}</span>
		</TableCell>
	);
}

function IdleTables({
	continueWatching,
	airing,
	playDisabled,
	onPlay,
	onOpen,
	watchedLastWeek,
}: {
	continueWatching: ContinueWatchingItem[];
	airing: AiringSoonGroup[];
	playDisabled: boolean;
	onPlay: (item: ContinueWatchingItem) => void;
	onOpen: (item: ContinueWatchingItem) => void;
	watchedLastWeek: number;
}) {
	return (
		<div className='flex flex-col gap-6'>
			{continueWatching.length > 0 ? (
				<section>
					<h2 className='mb-1 text-sm font-semibold'>Continue watching</h2>
					<Separator className='mb-2' />
					<Table containerClassName='overflow-visible'>
						<TableHeader>
							<TableRow>
								<TableHead>Title</TableHead>
								<TableHead>Episode</TableHead>
								<TableHead>Type</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{continueWatching.map((item) => (
								<TableRow
									key={item.animeId}
									className={playDisabled ? "opacity-50" : "cursor-pointer"}
									onClick={() => {
										if (!playDisabled) {
											onPlay(item);
										}
									}}>
									<TitleCellWithPoster item={item} />
									<TableCell className='text-muted-foreground'>
										Next episode {item.nextEpisode}
										{item.episodes != null && item.episodes > 0 ? ` of ${item.episodes}` : ""}
									</TableCell>
									<TableCell className='text-muted-foreground'>{item.type ?? "-"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{watchedLastWeek > 0 ? (
						<p className='mt-3 text-sm text-muted-foreground'>
							You've watched {watchedLastWeek} episode
							{watchedLastWeek === 1 ? "" : "s"} last week.
						</p>
					) : null}
				</section>
			) : null}
			{airing.length > 0 ? (
				<section>
					<h2 className='mb-1 text-sm font-semibold'>Airing soon</h2>
					<Separator className='mb-2' />
					<Table containerClassName='overflow-visible'>
						<TableHeader>
							<TableRow>
								<TableHead>Title</TableHead>
								<TableHead>Airing</TableHead>
								<TableHead>Type</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{airing.map((group) => (
								<IdleAiringDayRows key={group.label} group={group} onOpen={onOpen} />
							))}
						</TableBody>
					</Table>
				</section>
			) : null}
		</div>
	);
}

function IdleAiringDayRows({ group, onOpen }: { group: AiringSoonGroup; onOpen: (item: ContinueWatchingItem) => void }) {
	return (
		<>
			<TableRow className='bg-muted hover:bg-muted'>
				<TableCell colSpan={3} className='py-1.5 text-sm font-semibold'>
					{group.label}
				</TableCell>
			</TableRow>
			{group.items.map((item) => (
				<TableRow
					key={item.animeId}
					className='cursor-pointer'
					onClick={() => {
						onOpen(item);
					}}>
					<TitleCellWithPoster item={item} />
					<TableCell className='text-muted-foreground'>{airingCaption(item)}</TableCell>
					<TableCell className='text-muted-foreground'>{item.type ?? "-"}</TableCell>
				</TableRow>
			))}
		</>
	);
}

function IdlePosterStrip({
	label,
	items,
	disabled,
	onActivate,
	description,
}: {
	label: string;
	items: ContinueWatchingItem[];
	disabled?: boolean;
	onActivate: (item: ContinueWatchingItem) => void;
	description?: (item: ContinueWatchingItem) => string;
}) {
	return (
		<ScrollArea className='h-auto max-w-full' viewportClassName='overflow-x-auto overflow-y-hidden'>
			<ul aria-label={label} className='flex w-max snap-x snap-mandatory gap-3 pb-1'>
				{items.map((item) => (
					<li key={item.animeId} className='w-40 shrink-0 snap-start md:w-50'>
						<ContinueWatchingCard item={item} disabled={disabled} description={description?.(item)} onActivate={() => onActivate(item)} />
					</li>
				))}
			</ul>
		</ScrollArea>
	);
}

function IdleAiringRail({
	groups,
}: {
	groups: Array<{
		label: string;
		items: ContinueWatchingItem[];
		onActivate: (item: ContinueWatchingItem) => void;
	}>;
}) {
	const visible = groups.filter((group) => group.items.length > 0);
	if (visible.length === 0) {
		return null;
	}
	return (
		<ScrollArea className='h-auto w-full' viewportClassName='overflow-x-auto overflow-y-hidden'>
			<div className='flex w-max items-start'>
				{visible.map((group) => (
					<section key={group.label} className='flex flex-col'>
						<h2 className='sticky left-0 z-10 mb-1 w-max bg-background/90 py-0.5 pr-4 text-sm font-semibold backdrop-blur-sm'>{group.label}</h2>
						<Separator className='sticky left-0 z-10 mb-2 w-40 md:w-50' />
						<ul aria-label={group.label} className='flex snap-x snap-mandatory gap-3 pr-6 pb-1'>
							{group.items.map((item) => (
								<li key={item.animeId} className='w-40 shrink-0 snap-start md:w-50'>
									<ContinueWatchingCard item={item} description={airingCaption(item)} onActivate={() => group.onActivate(item)} />
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</ScrollArea>
	);
}

function ContinueWatchingCard({ item, disabled, description, onActivate }: { item: ContinueWatchingItem; disabled?: boolean; description?: string; onActivate: () => void }) {
	const total = item.episodes != null && item.episodes > 0 ? item.episodes : null;
	const caption = description ?? `Next episode ${item.nextEpisode}${total != null ? ` of ${total}` : ""}`;
	return (
		<Button
			type='button'
			variant='ghost'
			className='h-auto w-full min-w-0 rounded-xl p-0 text-left font-normal whitespace-normal hover:bg-transparent dark:hover:bg-transparent'
			disabled={disabled}
			onClick={onActivate}>
			<Card size='sm' className='w-full overflow-hidden py-0'>
				<span className='relative block aspect-square h-60 w-full overflow-hidden bg-muted md:h-75'>
					<AnimeCover id={item.animeId} kind='cover' coverUrl={item.coverUrl} alt='' lazy className='size-full' />
					<span className='pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/55 to-transparent p-2 pt-8'>
						<span className='block text-sm font-medium leading-snug wrap-break-word text-white'>{item.title}</span>
						<span className='mt-0.5 block text-xs leading-snug wrap-break-word text-white/80'>{caption}</span>
					</span>
					{item.type ? (
						<Badge variant='outline' className='absolute top-2 left-2 border-white/30 bg-black/50 text-white'>
							{item.type}
						</Badge>
					) : null}
				</span>
			</Card>
		</Button>
	);
}

function MatchedPlayback({ snapshot }: { snapshot: NowPlayingSnapshot }) {
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
						<Button
							type='button'
							variant='ghost'
							size='sm'
							onClick={() => {
								void desktopRpc.request.openExternal({ url: `https://anilist.co/anime/${match.id}` });
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
					<AnimeCover
						id={item.id}
						coverUrl={item.coverUrl || undefined}
						alt=''
						lazy
						width={40}
						height={60}
						className='aspect-2/3 w-10 shrink-0 overflow-hidden rounded-md bg-muted'
					/>
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

function countWatchedLastWeek(rows: HistoryRow[]): number {
	const cutoff = Date.now() - SEVEN_DAYS_MS;
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
