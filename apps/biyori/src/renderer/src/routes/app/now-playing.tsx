import { createFileRoute } from "@tanstack/react-router";
import { LayoutGridIcon, Table2Icon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { animeInfoSearchSchema } from "@/lib/schemas/anime-info-search";
import type { NowPlayingView } from "@/lib/schemas/app-settings";
import { IdleAiringRail } from "@/mainview/components/app/now-playing/airing-rail";
import { ContinueWatchingEmpty } from "@/mainview/components/app/now-playing/continue-card";
import { MatchedPlayback } from "@/mainview/components/app/now-playing/matched";
import { IdlePosterStrip } from "@/mainview/components/app/now-playing/poster-strip";
import { NowPlayingSkeleton } from "@/mainview/components/app/now-playing/skeleton";
import { IdleTables } from "@/mainview/components/app/now-playing/tables";
import { UnrecognizedPlayback } from "@/mainview/components/app/now-playing/unrecognized";
import { countWatchedLastWeek } from "@/mainview/components/app/now-playing/utils";
import { Button } from "@/mainview/components/ui/button";
import { Separator } from "@/mainview/components/ui/separator";
import { ToggleRadio, ToggleRadioItem } from "@/mainview/components/ui/toggle-radio";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { buildAiringSoon, buildContinueWatching, buildUpcoming, type ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";
import { trpc } from "@/mainview/trpc";

export const Route = createFileRoute("/app/now-playing")({
	validateSearch: animeInfoSearchSchema,
	component: NowPlayingPage,
});

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
			utils.settings.get.setData(undefined, {
				...current,
				nowPlayingView: next,
			});
		}
		void setSettings.mutateAsync({ nowPlayingView: next });
	}
	const queued = historyQuery.data?.queued ?? [];
	const history = historyQuery.data?.history ?? [];
	const listed = listedQuery.data ?? [];
	const skipStatus = new Set(listed.filter((row) => row.status === "Completed" || row.status === "Dropped").map((row) => row.id));
	const staleDays = settingsQuery.data?.continueWatchingStaleDays ?? 30;
	const continueWatching = buildContinueWatching([...queued, ...history], listed, Date.now(), staleDays * 24 * 60 * 60 * 1000);
	const continueItems = [...continueWatching.recent, ...continueWatching.older];
	const airingSkip = new Set([...skipStatus, ...continueItems.map((item) => item.animeId)]);
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

	if (continueWatching.recent.length === 0 && continueWatching.older.length === 0 && !hasAiring && upcoming.length === 0) {
		return (
			<div className='flex h-full items-center justify-center p-4'>
				<ContinueWatchingEmpty className='min-h-64 w-full max-w-2xl' description='They show up here once a new episode is in your library.' />
			</div>
		);
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
					{continueItems.length > 0 || hasAiring ? <IdleLayoutToggle value={layout} onValueChange={setLayout} /> : null}
				</header>

				{layout === "table" ? (
					<IdleTables
						continueWatching={continueWatching.recent}
						earlierWatching={continueWatching.older}
						earlierDays={staleDays}
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
				) : (
					<div className='flex min-w-0 flex-col gap-6 @3xl:flex-row @3xl:items-start @3xl:gap-3'>
						<section className='flex w-full min-w-0 flex-col gap-6 @3xl:max-w-max @3xl:flex-1'>
							<IdlePosterStrip
								heading='Continue watching'
								label='Continue watching'
								items={continueWatching.recent}
								earlier={continueWatching.older}
								earlierDays={staleDays}
								disabled={playNext.isPending}
								onActivate={(item) => {
									void playNext.mutateAsync({
										animeId: item.animeId,
										episodesWatched: item.nextEpisode - 1,
									});
								}}
								onOpen={(item) => {
									animeInfo.open({ id: item.animeId, infoTab: "main" });
								}}
							/>
							{watchedLastWeek > 0 ? (
								<p className='mt-3 w-0 min-w-full text-sm text-muted-foreground'>
									You've watched {watchedLastWeek} episode
									{watchedLastWeek === 1 ? "" : "s"} last week.
								</p>
							) : null}
						</section>
						{hasAiring ? (
							<section className='w-full min-w-0 @3xl:max-w-max @3xl:flex-1'>
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
				)}

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
