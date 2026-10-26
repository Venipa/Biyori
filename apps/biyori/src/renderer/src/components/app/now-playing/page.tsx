import { useTranslation } from "@biyori/translations/react";
import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { ContinueWatchingCard, ContinueWatchingEmpty } from "@/mainview/components/app/now-playing/continue-card";
import { MatchedPlayback } from "@/mainview/components/app/now-playing/matched";
import { NowPlayingSkeleton } from "@/mainview/components/app/now-playing/skeleton";
import { UnrecognizedPlayback } from "@/mainview/components/app/now-playing/unrecognized";
import { airingCaption, episodeLine } from "@/mainview/components/app/now-playing/utils";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { buildAiringSoon, buildContinueWatching, buildUpcoming, type ContinueWatchingItem } from "@/mainview/lib/now-playing-idle";
import { trpc } from "@/mainview/trpc";

export function NowPlayingPage() {
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
				<div className='flex w-full max-w-6xl flex-col gap-6 px-6 py-5 pb-10'>
					<UnrecognizedPlayback snapshot={snapshot} />
				</div>
			) : (
				<MatchedPlayback snapshot={snapshot} />
			)}
		</ScrollArea>
	);
}

function IdleNowPlaying() {
	const playsQuery = trpc.history.recentPlays.useQuery();
	const listedQuery = trpc.anime.listed.useQuery();
	const settingsQuery = trpc.settings.get.useQuery();
	const playNext = trpc.library.playNext.useMutation();
	const animeInfo = useAnimeInfoNav();
	const { t } = useTranslation();
	function playContinue(item: ContinueWatchingItem): void {
		void playNext.mutateAsync({
			animeId: item.animeId,
			episodesWatched: item.nextEpisode - 1,
		});
	}
	function openItem(item: ContinueWatchingItem): void {
		animeInfo.open({ id: item.animeId, infoTab: "main" });
	}
	const listed = listedQuery.data ?? [];
	const skipStatus = new Set(listed.filter((row) => row.status === "Completed" || row.status === "Dropped").map((row) => row.id));
	const staleDays = settingsQuery.data?.continueWatchingStaleDays ?? 30;
	const continueLabel = t("nowPlaying.continueWatching");
	const continueWatching = buildContinueWatching(playsQuery.data?.plays ?? [], listed, Date.now(), staleDays * 24 * 60 * 60 * 1000);
	const continueItems = [...continueWatching.recent, ...continueWatching.earlier, ...continueWatching.older];
	const airingSkip = new Set([...skipStatus, ...continueItems.map((item) => item.animeId)]);
	const airing = buildAiringSoon(listed, airingSkip, Date.now());
	const airingIds = airing.flatMap((group) => group.items.map((item) => item.animeId));
	const upcoming = buildUpcoming(listed, new Set([...skipStatus, ...airingIds]));
	const watchedLastWeek = playsQuery.data?.watchedLastWeek ?? 0;

	if ((playsQuery.isPending && !playsQuery.data) || (listedQuery.isPending && !listedQuery.data)) {
		return <NowPlayingSkeleton />;
	}

	if (continueItems.length === 0 && airing.length === 0 && upcoming.length === 0) {
		return (
			<div className='flex h-full items-center justify-center p-4'>
				<ContinueWatchingEmpty className='min-h-64 w-full max-w-2xl' description={t("nowPlaying.waitingDescription")} />
			</div>
		);
	}

	return (
		<ScrollArea className='h-full' viewportClassName='px-6 pb-8'>
			<div className='flex w-full max-w-6xl flex-col gap-6'>
				<header className='flex flex-col gap-1 pt-5'>
					<h1 className='text-lg font-semibold tracking-tight'>{t("nowPlaying.idleTitle")}</h1>
					<p className='text-sm text-muted-foreground'>
						{t("nowPlaying.idleDescription")}
						{watchedLastWeek > 0 ? ` · ${t("nowPlaying.watchedLastWeek", { count: watchedLastWeek })}` : ""}
					</p>
				</header>
				{continueItems.length > 0 ? (
					<IdleSection title={continueLabel}>
						<ul aria-label={continueLabel} className='grid grid-cols-[repeat(auto-fill,12rem)] gap-3'>
							{[...continueWatching.recent, ...continueWatching.earlier].map((item) => (
								<li key={item.animeId}>
									<ContinueWatchingCard item={item} disabled={playNext.isPending} playNextEnabled onActivate={() => playContinue(item)} />
								</li>
							))}
						</ul>
						{continueWatching.older.length > 0 ? (
							<>
								<h3 className='mt-2 text-xs text-muted-foreground'>{t("nowPlaying.olderThan", { days: staleDays, count: staleDays })}</h3>
								<ul className='grid gap-x-4 sm:grid-cols-2'>
									{continueWatching.older.map((item) => (
										<IdleRow key={item.animeId} id={item.animeId} title={item.title} coverUrl={item.coverUrl} detail={episodeLine(item)} onClick={() => openItem(item)} />
									))}
								</ul>
							</>
						) : null}
					</IdleSection>
				) : null}
				{airing.length > 0 ? (
					<IdleSection title={t("nowPlaying.schedule")}>
						{airing.map((group) => (
							<div key={group.label} className='flex flex-col'>
								<h3 className='px-1 pb-1 text-xs text-muted-foreground'>{group.label}</h3>
								<ul className='grid gap-x-4 sm:grid-cols-2'>
									{group.items.map((item) => (
										<IdleRow key={item.animeId} id={item.animeId} title={item.title} coverUrl={item.coverUrl} detail={airingCaption(item)} onClick={() => openItem(item)} />
									))}
								</ul>
							</div>
						))}
					</IdleSection>
				) : null}
				{upcoming.length > 0 ? (
					<IdleSection title={t("nowPlaying.upcoming")}>
						<ul className='grid gap-x-4 sm:grid-cols-2'>
							{upcoming.map((item) => (
								<IdleRow
									key={item.id}
									id={item.id}
									title={item.title}
									coverUrl={item.coverUrl}
									detail={item.startsAt ? new Date(item.startsAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : (item.season ?? "")}
									onClick={() => {
										animeInfo.open({ id: item.id, infoTab: "main", title: item.title, coverUrl: item.coverUrl });
									}}
								/>
							))}
						</ul>
					</IdleSection>
				) : null}
			</div>
		</ScrollArea>
	);
}

/** Plain section on the window: sticky title with a hairline, no card. */
function IdleSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className='flex flex-col gap-3'>
			<h2 className='sticky top-0 z-10 -mx-1 border-b bg-background/95 px-1 py-2 text-sm font-medium backdrop-blur-sm'>{title}</h2>
			{children}
		</section>
	);
}

function IdleRow({ id, title, coverUrl, detail, onClick }: { id: number; title: string; coverUrl?: string; detail: string; onClick: () => void }) {
	return (
		<li>
			<button type='button' onClick={onClick} className='flex w-full items-center gap-3 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted'>
				<AnimeCover id={id} coverUrl={coverUrl} alt='' className='aspect-2/3 w-7 shrink-0 overflow-hidden rounded-sm bg-muted' lazy />
				<span className='min-w-0 flex-1 truncate'>{title}</span>
				<span className='shrink-0 text-xs text-muted-foreground tabular-nums'>{detail}</span>
			</button>
		</li>
	);
}
