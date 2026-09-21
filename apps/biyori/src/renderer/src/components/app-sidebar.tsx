import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3Icon, CalendarDaysIcon, FolderIcon, HistoryIcon, HomeIcon, PlayIcon, RssIcon } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { desktopRpc } from "@/desktop-rpc";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { SidebarSearch } from "@/mainview/components/sidebar-search";
import { Button } from "@/mainview/components/ui/button";
import { clearListFilterText, useListFilterText } from "@/mainview/lib/list-filter";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { ANIME_LIST_SEARCH_TAB, animeListTabSchema, listStatusSchema } from "@/shared/list";

const listItems = [
	{ to: "/app/library", label: "Library", icon: FolderIcon },
	{ to: "/app/history", label: "History", icon: HistoryIcon },
	{ to: "/app/statistics", label: "Statistics", icon: BarChart3Icon },
] as const;

const toolItems = [
	{ to: "/app/seasons", label: "Seasons", icon: CalendarDaysIcon },
	{ to: "/app/torrents", label: "Torrents", icon: RssIcon },
] as const;

const otherListStatuses = listStatusSchema.options.filter((status) => status !== "Currently watching");

const chipLabel: Record<(typeof otherListStatuses)[number], string> = {
	Completed: "Done",
	"On hold": "Hold",
	Dropped: "Drop",
	"Plan to watch": "Plan",
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

function ActiveNavPill({ active, isEnter }: { active: boolean; isEnter: boolean }) {
	if (!active) {
		return null;
	}
	return (
		<motion.span
			layoutId='app-nav-pill'
			layout='position'
			aria-hidden
			className='pointer-events-none absolute top-1/2 left-1.5 z-20 mt-[-7px] h-3.5 w-1 rounded-full bg-primary'
			initial={isEnter ? { opacity: 0 } : false}
			animate={{ opacity: 1 }}
			transition={navPillSpring}
		/>
	);
}

export function AppSidebar() {
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
		<nav aria-label='Main navigation' className='relative z-30 flex h-full min-h-0 w-56 shrink-0 flex-col gap-2 overflow-visible border-r bg-sidebar p-2'>
			<SidebarSearch />
			<div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto'>
				<LayoutGroup id='app-sidebar-nav'>
					<NowPlayingNavLink active={pathname === "/app/now-playing"} isEnter={isEnter} />
					<NavGroup label='Library'>
						<AnimeListNavSection pathname={pathname} isEnter={isEnter} />
						{listItems.map((item) => (
							<NavLink key={item.to} {...item} active={pathname === item.to} isEnter={isEnter} badge={item.to === "/app/history" ? queuedCount : undefined} />
						))}
					</NavGroup>
					<NavGroup label='Discover'>
						{toolItems.map((item) => (
							<NavLink key={item.to} {...item} active={pathname === item.to} isEnter={isEnter} />
						))}
					</NavGroup>
				</LayoutGroup>
				{update.updateAvailable ? (
					<div className='mt-auto rounded-md border border-primary/30 bg-primary/10 p-2'>
						<p className='text-sm font-medium text-foreground'>Update available</p>
						<p className='mt-0.5 text-xs text-muted-foreground'>
							{update.remoteVersion ? `Version ${update.remoteVersion}` : "New build ready"}
							{update.updateReady ? " (downloaded)" : null}
						</p>
						<Button
							type='button'
							size='sm'
							className='mt-2 w-full'
							onClick={() => {
								void desktopRpc.request.openUpdate({});
							}}>
							Update
						</Button>
					</div>
				) : null}
			</div>
		</nav>
	);
}

function nowPlayingSubLines(snapshot: {
	media: { player: string } | null;
	parsed: {
		title: string;
		season: number | null;
		episode: number | null;
		group: string | null;
	} | null;
	match: { title: string; type: string | null } | null;
}): string[] {
	const title = snapshot.match?.title ?? snapshot.parsed?.title;
	if (!snapshot.media || !title) {
		return [];
	}
	const lines = [title];
	if (snapshot.match?.type === "Movie") {
		lines.push("Movie");
	} else if (snapshot.parsed?.episode != null) {
		lines.push(`Episode ${snapshot.parsed.episode}`);
	}
	return lines;
}

function NowPlayingNavLink({ active, isEnter }: { active: boolean; isEnter: boolean }) {
	const snapshot = trpc.media.nowPlaying.useQuery().data;
	const playing = Boolean(snapshot?.media);
	const latest = trpc.history.latest.useQuery(undefined, { enabled: !playing });
	const subLines = playing && snapshot ? nowPlayingSubLines(snapshot) : latest.data?.title ? [latest.data.title] : [];
	const coverId = playing ? snapshot?.match?.id : latest.data?.animeId;
	const coverUrl = playing ? snapshot?.match?.coverUrl : latest.data?.coverUrl;
	const hasSubtitle = subLines.length > 0;
	const showCover = hasSubtitle && coverId != null && Boolean(coverUrl);

	return (
		<Button
			variant='ghost'
			render={<Link to='/app/now-playing' aria-current={active ? "page" : undefined} />}
			nativeButton={false}
			className={cn(
				"relative h-auto w-full flex-col items-stretch gap-0 overflow-hidden rounded-lg border border-border p-0 hover:bg-transparent",
				hasSubtitle && "whitespace-normal",
				active ? "text-foreground" : "text-foreground/80",
			)}>
			{showCover ? (
				<span aria-hidden className='pointer-events-none absolute inset-0'>
					<AnimeCover
						id={coverId}
						coverUrl={coverUrl || undefined}
						alt=''
						className={cn("size-full scale-125 opacity-50 blur-xs [mask-image:radial-gradient(8rem_6rem_at_22%_62%,#000,transparent)]", !playing && "grayscale")}
					/>
					<span className='absolute inset-0 bg-sidebar/40' />
				</span>
			) : null}
			<span className={cn("relative z-10 flex min-h-8 items-center gap-2 px-3 py-1.5", playing && "bg-list-playing/80 text-list-playing-foreground")}>
				<ActiveNavPill active={active} isEnter={isEnter} />
				{playing ? <PlayIcon className='size-4 shrink-0 fill-current' /> : <HomeIcon className='size-4 shrink-0' />}
				<span className='truncate'>{playing ? "Now playing" : "Home"}</span>
			</span>
			{hasSubtitle ? (
				<>
					<span className='relative z-10 h-px bg-border' />
					<span className='relative z-10 flex items-center gap-2 px-3 py-1.5'>
						{showCover ? (
							<AnimeCover id={coverId} coverUrl={coverUrl || undefined} alt='' className={cn("aspect-2/3 w-7 shrink-0 overflow-hidden rounded-sm", !playing && "grayscale")} />
						) : null}
						<span className='flex min-w-0 flex-1 flex-col items-start gap-0.5'>
							{playing ? null : <span className='text-xs text-muted-foreground'>Last played</span>}
							<span className='line-clamp-2 text-left text-xs font-normal text-foreground/80'>{subLines.join(" ")}</span>
						</span>
					</span>
				</>
			) : null}
		</Button>
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
				aria-label='Currently watching'
				onClick={goToStatus}
				className={cn(
					"relative flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm hover:bg-list-playing hover:text-list-playing-foreground",
					watchingActive ? "bg-list-playing text-list-playing-foreground" : "text-foreground/80",
				)}>
				<ActiveNavPill active={watchingActive} isEnter={isEnter} />
				<PlayIcon className='size-4 shrink-0' />
				<span className='flex-1 truncate'>Watching</span>
				<span className='text-xs tabular-nums opacity-70'>{countsQuery.data?.["Currently watching"] ?? 0}</span>
			</Link>
			<div className='grid grid-cols-4 gap-1' role='group' aria-label='Other lists'>
				{otherListStatuses.map((status) => {
					const childActive = childTab === status;
					return (
						<Link
							key={status}
							to='/app/anime-list'
							search={{ tab: status }}
							aria-current={childActive ? "page" : undefined}
							aria-label={status}
							title={status}
							onClick={goToStatus}
							className={cn(
								"relative flex min-h-8 flex-col items-center justify-center rounded-md px-0.5 py-1 text-center text-xs leading-tight text-muted-foreground",
								chipTone[status],
							)}>
							<span className='text-xs tabular-nums'>{countsQuery.data?.[status] ?? 0}</span>
							<span>{chipLabel[status]}</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}

function NavLink({ to, label, icon: Icon, badge, active, isEnter }: { to: string; label: string; icon: typeof PlayIcon; badge?: number; active: boolean; isEnter: boolean }) {
	return (
		<Link to={to} aria-current={active ? "page" : undefined} className={navItemClass(active)}>
			<ActiveNavPill active={active} isEnter={isEnter} />
			<Icon className='size-4 shrink-0 text-current' />
			<span className='flex-1 truncate'>{label}</span>
			{typeof badge === "number" && badge > 0 ? <span className='text-xs text-muted-foreground'>({badge})</span> : null}
		</Link>
	);
}
