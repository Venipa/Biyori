import { useTranslation } from "@biyori/translations/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3Icon, CalendarDaysIcon, FolderIcon, HistoryIcon, HomeIcon, PlayIcon, RssIcon } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { desktopRpc } from "@/desktop-rpc";
import { AnimeCover } from "@/mainview/components/app/anime/cover";
import { SidebarSearch } from "@/mainview/components/app/shell/sidebar-search";
import { Button } from "@/mainview/components/ui/button";
import { useAnimeInfoNav } from "@/mainview/lib/anime-info-nav";
import { clearListFilterText, useListFilterText } from "@/mainview/lib/list-filter";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { ANIME_LIST_SEARCH_TAB, animeListTabSchema, listStatusSchema } from "@/shared/list";

const listItems = [
	{ to: "/app/library", labelKey: "nav.library", icon: FolderIcon },
	{ to: "/app/history", labelKey: "nav.history", icon: HistoryIcon },
	{ to: "/app/statistics", labelKey: "nav.statistics", icon: BarChart3Icon },
] as const;

const toolItems = [
	{ to: "/app/seasons", labelKey: "nav.seasons", icon: CalendarDaysIcon },
	{ to: "/app/torrents", labelKey: "nav.torrents", icon: RssIcon },
] as const;

const otherListStatuses = listStatusSchema.options.filter((status) => status !== "Currently watching");

const chipLabelKey: Record<(typeof otherListStatuses)[number], "nav.done" | "nav.hold" | "nav.drop" | "nav.plan"> = {
	Completed: "nav.done",
	"On hold": "nav.hold",
	Dropped: "nav.drop",
	"Plan to watch": "nav.plan",
};

const statusLabelKey: Record<(typeof otherListStatuses)[number], "nav.completed" | "nav.onHold" | "nav.dropped" | "nav.planToWatch"> = {
	Completed: "nav.completed",
	"On hold": "nav.onHold",
	Dropped: "nav.dropped",
	"Plan to watch": "nav.planToWatch",
};

const chipTone: Record<(typeof otherListStatuses)[number], string> = {
	Completed: "hover:bg-list-completed hover:text-list-completed-foreground aria-[current=page]:bg-list-completed aria-[current=page]:text-list-completed-foreground",
	"On hold": "hover:bg-list-hold hover:text-list-hold-foreground aria-[current=page]:bg-list-hold aria-[current=page]:text-list-hold-foreground",
	Dropped: "hover:bg-list-dropped hover:text-list-dropped-foreground aria-[current=page]:bg-list-dropped aria-[current=page]:text-list-dropped-foreground",
	"Plan to watch": "hover:bg-list-planned hover:text-list-planned-foreground aria-[current=page]:bg-list-planned aria-[current=page]:text-list-planned-foreground",
};

const navDestinations: string[] = ["/app/now-playing", "/app/anime-list", "/app/search", ...listItems.map((item) => item.to), ...toolItems.map((item) => item.to)];

const navPillSpring = { type: "spring", stiffness: 500, damping: 40 } as const;

function navItemClass(active: boolean): string {
	return cn("relative flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted", active ? "text-foreground" : "text-foreground/80");
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className='flex flex-col gap-0.5'>
			<p className='px-2 py-1 text-xs text-muted-foreground'>{label}</p>
			{children}
		</div>
	);
}

function NavIconSlot({ active, isEnter, children }: { active: boolean; isEnter: boolean; children: ReactNode }) {
	return (
		<span className='relative grid size-6 shrink-0 place-items-center'>
			{active ? (
				<motion.span
					layoutId='app-nav-pill'
					aria-hidden
					className='pointer-events-none absolute inset-0 rounded-md bg-primary/15'
					initial={isEnter ? { opacity: 0 } : false}
					animate={{ opacity: 1 }}
					transition={navPillSpring}
				/>
			) : null}
			<span className='relative'>{children}</span>
		</span>
	);
}

export function AppSidebar() {
	const { t } = useTranslation();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const historyQuery = trpc.history.queuedCount.useQuery(undefined, {
		refetchInterval: (query) => ((query.state.data ?? 0) > 0 ? 3_000 : false),
	});
	const queuedCount = historyQuery.data ?? 0;
	const update = useUpdateStatus();
	const hasActive = navDestinations.includes(pathname);
	const pillShown = useRef(false);
	if (!hasActive) {
		pillShown.current = false;
	}
	const isEnter = hasActive && !pillShown.current;
	if (hasActive) {
		pillShown.current = true;
	}

	return (
		<nav aria-label={t("nav.main")} className='relative z-30 flex h-full min-h-0 w-56 shrink-0 flex-col gap-2 overflow-visible border-r bg-sidebar p-2'>
			<div className='relative z-10'>
				<SidebarSearch />
			</div>
			<div className='relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto'>
				<LayoutGroup id='app-sidebar-nav'>
					<NowPlayingNavLink active={pathname === "/app/now-playing"} isEnter={isEnter} />
					<NavGroup label={t("nav.library")}>
						<AnimeListNavSection pathname={pathname} isEnter={isEnter} />
						{listItems.map((item) => (
							<NavLink key={item.to} {...item} active={pathname === item.to} isEnter={isEnter} badge={item.to === "/app/history" ? queuedCount : undefined} />
						))}
					</NavGroup>
					<NavGroup label={t("nav.discover")}>
						{toolItems.map((item) => (
							<NavLink key={item.to} {...item} active={pathname === item.to} isEnter={isEnter} />
						))}
					</NavGroup>
				</LayoutGroup>
				{update.updateAvailable ? (
					<div className='mt-auto rounded-md border border-primary/30 bg-primary/10 p-2'>
						<p className='text-sm font-medium text-foreground'>{t("nav.updateAvailable")}</p>
						<p className='mt-0.5 text-xs text-muted-foreground'>
							{update.remoteVersion ? t("nav.version", { version: update.remoteVersion }) : t("nav.newBuildReady")}
							{update.updateReady ? ` ${t("nav.downloaded")}` : null}
						</p>
						<Button
							type='button'
							size='sm'
							className='mt-2 w-full'
							onClick={() => {
								void desktopRpc.request.openUpdate({});
							}}>
							{t("shell.update")}
						</Button>
					</div>
				) : null}
			</div>
		</nav>
	);
}

function nowPlayingSubLines(
	snapshot: {
		media: { player: string } | null;
		parsed: {
			title: string;
			season: number | null;
			episode: number | null;
			group: string | null;
		} | null;
		match: { title: string; type: string | null } | null;
	},
	labels: { movie: string; episode: (episode: number) => string },
): string[] {
	const title = snapshot.match?.title ?? snapshot.parsed?.title;
	if (!snapshot.media || !title) {
		return [];
	}
	const lines = [title];
	if (snapshot.match?.type === "Movie") {
		lines.push(labels.movie);
	} else if (snapshot.parsed?.episode != null) {
		lines.push(labels.episode(snapshot.parsed.episode));
	}
	return lines;
}

function NowPlayingNavLink({ active, isEnter }: { active: boolean; isEnter: boolean }) {
	const { t } = useTranslation();
	const animeInfo = useAnimeInfoNav();
	const snapshot = trpc.media.nowPlaying.useQuery().data;
	const playing = Boolean(snapshot?.media);
	const latest = trpc.history.latest.useQuery(undefined, { enabled: !playing });
	const [title, episodeLabel] =
		playing && snapshot
			? nowPlayingSubLines(snapshot, {
					movie: t("nowPlaying.movie"),
					episode: (episode) => t("nowPlaying.episodeNumber", { episode }),
				})
			: [latest.data?.title];
	const coverId = playing ? snapshot?.match?.id : latest.data?.animeId;
	const coverUrl = playing ? snapshot?.match?.coverUrl : latest.data?.coverUrl;
	const rowClass = "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted";
	const media = title ? (
		<>
			<AnimeCover id={coverId ?? null} coverUrl={coverUrl || undefined} alt='' className='aspect-2/3 w-10 shrink-0 overflow-hidden rounded-sm bg-muted' />
			<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<span className='line-clamp-2 text-xs text-foreground/90'>{title}</span>
				<span className='flex items-center gap-1 text-xs text-muted-foreground'>
					{playing ? <PlayIcon aria-hidden className='size-3 shrink-0 fill-list-playing-foreground text-list-playing-foreground' /> : null}
					<span className='truncate'>{playing ? [t("nowPlaying.kicker"), episodeLabel].filter(Boolean).join(" · ") : t("nav.lastPlayed")}</span>
				</span>
			</span>
		</>
	) : null;

	return (
		<div className='flex flex-col gap-0.5'>
			<Link to='/app/now-playing' aria-current={active ? "page" : undefined} className={navItemClass(active)}>
				<NavIconSlot active={active} isEnter={isEnter}>
					<HomeIcon className='size-4 shrink-0 text-current' />
				</NavIconSlot>
				<span className='flex-1 truncate'>{t("nav.home")}</span>
			</Link>
			{media && playing ? (
				<Link to='/app/now-playing' className={rowClass}>
					{media}
				</Link>
			) : media && coverId != null ? (
				<button
					type='button'
					className={rowClass}
					onClick={() => {
						animeInfo.open({ id: coverId, infoTab: "main", title, coverUrl: coverUrl || undefined });
					}}>
					{media}
				</button>
			) : null}
		</div>
	);
}

function listTabFromSearch(search: unknown): unknown {
	if (search == null) {
		return undefined;
	}
	if (typeof search === "string") {
		return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("tab") ?? undefined;
	}
	if (typeof search === "object" && "tab" in search) {
		return search.tab;
	}
	return undefined;
}

function AnimeListNavSection({ pathname, isEnter }: { pathname: string; isEnter: boolean }) {
	const { t } = useTranslation();
	const listFilter = useListFilterText();
	const searching = listFilter.trim().length > 0;
	const countsQuery = trpc.anime.counts.useQuery();
	const tabRaw = useRouterState({
		select: (state) => listTabFromSearch(state.location.search),
	});
	const parsedTab = animeListTabSchema.safeParse(tabRaw);
	const onList = pathname === "/app/anime-list" || pathname === "/app/anime-list/";
	const statusTab = parsedTab.success && parsedTab.data !== ANIME_LIST_SEARCH_TAB ? parsedTab.data : "Currently watching";
	const childTab = onList && !searching && parsedTab.data !== ANIME_LIST_SEARCH_TAB ? statusTab : undefined;

	function goToStatus(): void {
		clearListFilterText();
	}

	const watchingActive = childTab === "Currently watching";

	return (
		<div className='flex flex-col gap-1'>
			<Link
				to='/app/anime-list'
				search={{ tab: "Currently watching" }}
				aria-current={watchingActive ? "page" : undefined}
				aria-label={t("nav.currentlyWatching")}
				onClick={goToStatus}
				className={cn(
					"relative flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm hover:bg-list-playing hover:text-list-playing-foreground",
					watchingActive ? "bg-list-playing text-list-playing-foreground" : "text-foreground/80",
				)}>
				<NavIconSlot active={watchingActive} isEnter={isEnter}>
					<PlayIcon className='size-4 shrink-0' />
				</NavIconSlot>
				<span className='flex-1 truncate'>{t("nav.watching")}</span>
				<span className='text-xs tabular-nums opacity-70'>{countsQuery.data?.["Currently watching"] ?? 0}</span>
			</Link>
			<div className='grid grid-cols-4 gap-1' role='group' aria-label={t("nav.otherLists")}>
				{otherListStatuses.map((status) => {
					const childActive = childTab === status;
					return (
						<Link
							key={status}
							to='/app/anime-list'
							search={{ tab: status }}
							aria-current={childActive ? "page" : undefined}
							aria-label={t(statusLabelKey[status])}
							title={t(statusLabelKey[status])}
							onClick={goToStatus}
							className={cn(
								"relative flex min-h-8 flex-col items-center justify-center rounded-md px-0.5 py-1 text-center text-xs leading-tight text-muted-foreground",
								chipTone[status],
							)}>
							<span className='text-xs tabular-nums'>{countsQuery.data?.[status] ?? 0}</span>
							<span>{t(chipLabelKey[status])}</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}

function NavLink({
	to,
	labelKey,
	icon: Icon,
	badge,
	active,
	isEnter,
}: {
	to: string;
	labelKey: (typeof listItems)[number]["labelKey"] | (typeof toolItems)[number]["labelKey"];
	icon: typeof PlayIcon;
	badge?: number;
	active: boolean;
	isEnter: boolean;
}) {
	const { t } = useTranslation();
	return (
		<Link to={to} aria-current={active ? "page" : undefined} className={navItemClass(active)}>
			<NavIconSlot active={active} isEnter={isEnter}>
				<Icon className='size-4 shrink-0 text-current' />
			</NavIconSlot>
			<span className='flex-1 truncate'>{t(labelKey)}</span>
			{typeof badge === "number" && badge > 0 ? <span className='text-xs text-muted-foreground'>({badge})</span> : null}
		</Link>
	);
}
