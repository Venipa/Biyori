import { Link, useRouterState } from "@tanstack/react-router";
import {
	BarChart3Icon,
	BookmarkIcon,
	CalendarDaysIcon,
	CheckIcon,
	FolderIcon,
	HistoryIcon,
	HomeIcon,
	ListIcon,
	PauseIcon,
	PlayIcon,
	RssIcon,
	SearchIcon,
	XIcon,
} from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { desktopRpc } from "@/desktop-rpc";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { Button } from "@/mainview/components/ui/button";
import { clearListFilterText, useListFilterText } from "@/mainview/lib/list-filter";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { ANIME_LIST_SEARCH_TAB, animeListTabSchema, type ListStatus, listStatusSchema, listStatusShortLabel } from "@/shared/list";

const listItems = [
	{ to: "/app/library", label: "Library", icon: FolderIcon },
	{ to: "/app/history", label: "History", icon: HistoryIcon },
	{ to: "/app/statistics", label: "Statistics", icon: BarChart3Icon },
] as const;

const toolItems = [
	{ to: "/app/search", label: "Search", icon: SearchIcon },
	{ to: "/app/seasons", label: "Seasons", icon: CalendarDaysIcon },
	{ to: "/app/torrents", label: "Torrents", icon: RssIcon },
] as const;

const listStatusIcons = {
	"Currently watching": PlayIcon,
	Completed: CheckIcon,
	"On hold": PauseIcon,
	Dropped: XIcon,
	"Plan to watch": BookmarkIcon,
} as const satisfies Record<ListStatus, typeof PlayIcon>;

const navDestinations: string[] = ["/app/now-playing", "/app/anime-list", ...listItems.map((item) => item.to), ...toolItems.map((item) => item.to)];

const navPillSpring = { type: "spring", stiffness: 500, damping: 40 } as const;

function navItemClass(active: boolean): string {
	return cn(
		"relative flex w-full items-center gap-2 rounded-md py-1.5 pr-2 pl-4 text-left text-sm transition-colors",
		active ? "bg-muted text-foreground" : "text-foreground/80 hover:bg-muted",
	);
}

function navChildClass(active: boolean): string {
	return cn(
		"relative flex w-full items-center gap-2 py-1 pr-2 pl-7 text-left text-sm transition-colors",
		active ? "font-medium text-foreground" : "text-foreground/70 hover:text-foreground",
	);
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

function ChildNavPill({ active }: { active: boolean }) {
	if (!active) {
		return null;
	}
	return (
		<motion.span
			layoutId='app-nav-child-pill'
			aria-hidden
			className='pointer-events-none absolute top-1/2 left-2 z-20 h-3.5 w-1 rounded-full bg-primary'
			initial={false}
			animate={{ x: "-50%", y: "-50%" }}
			transition={navPillSpring}
		/>
	);
}

function NavRailDot() {
	return <span aria-hidden className='pointer-events-none absolute top-1/2 left-2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border' />;
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
		<nav aria-label='Main navigation' className='flex h-full min-h-0 w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-sidebar p-2'>
			<LayoutGroup id='app-sidebar-nav'>
				<div className='flex flex-col gap-0.5'>
					<NowPlayingNavLink active={pathname === "/app/now-playing"} isEnter={isEnter} />
				</div>
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
	const coverId = snapshot?.match?.id;
	const coverUrl = snapshot?.match?.coverUrl;
	const showCover = Boolean(playing && coverId);
	const subLines = snapshot && playing ? nowPlayingSubLines(snapshot) : [];

	return (
		<Button
			variant='ghost'
			render={<Link to='/app/now-playing' aria-current={active ? "page" : undefined} />}
			nativeButton={false}
			className={cn(
				"relative isolate h-auto min-h-8 w-full justify-start py-1.5 pr-2 pl-4 transition-colors has-data-[icon=inline-start]:pl-4",
				showCover ? "items-stretch" : "items-start",
				subLines.length > 0 ? "whitespace-normal" : undefined,
				active ? "text-foreground" : "text-foreground/80",
			)}>
			<ActiveNavPill active={active} isEnter={isEnter} />
			{showCover ? (
				<span aria-hidden className='pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]'>
					<AnimeCover id={coverId} coverUrl={coverUrl || undefined} alt='' className='size-full scale-110 object-cover opacity-10 blur-[2px]' />
				</span>
			) : null}
			{showCover ? (
				<AnimeCover id={coverId} coverUrl={coverUrl || undefined} alt='' className='relative aspect-2/3 w-10 shrink-0 overflow-hidden rounded-md' />
			) : playing ? (
				<PlayIcon data-icon='inline-start' className='relative fill-current text-success' />
			) : (
				<HomeIcon data-icon='inline-start' className='relative' />
			)}
			<span className='relative flex min-w-0 flex-1 flex-col items-start gap-0.5'>
				<span className='truncate'>Home</span>
				{subLines.map((line) => (
					<span key={line} className='w-full truncate text-xs font-normal text-muted-foreground'>
						{line}
					</span>
				))}
			</span>
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

	return (
		<div className='relative flex flex-col gap-0.5'>
			<span aria-hidden className='pointer-events-none absolute top-4 bottom-3.5 left-2 z-0 w-px -translate-x-1/2 bg-border' />
			<Link
				to='/app/anime-list'
				search={{ tab: "Currently watching" }}
				aria-current={onList && !childTab ? "page" : undefined}
				onClick={goToStatus}
				className={navItemClass(onList)}>
				<ActiveNavPill active={onList} isEnter={isEnter} />
				<NavRailDot />
				<ListIcon className='size-4 shrink-0 text-current' />
				<span className='flex-1 truncate'>Anime List</span>
			</Link>
			<LayoutGroup id='app-anime-list-subnav'>
				<div className='flex flex-col'>
					{listStatusSchema.options.map((status, index) => {
						const childActive = childTab === status;
						const StatusIcon = listStatusIcons[status];
						const isLast = index === listStatusSchema.options.length - 1;
						return (
							<Link
								key={status}
								to='/app/anime-list'
								search={{ tab: status }}
								aria-current={childActive ? "page" : undefined}
								aria-label={status}
								title={status}
								onClick={goToStatus}
								className={navChildClass(childActive)}>
								<ChildNavPill active={childActive} />
								{isLast ? <NavRailDot /> : null}
								<StatusIcon aria-hidden className='size-3.5 shrink-0' />
								<span className='flex-1 truncate'>{listStatusShortLabel(status)}</span>
								<span className={cn("text-xs tabular-nums", childActive ? "text-foreground" : "text-muted-foreground")}>{countsQuery.data?.[status] ?? 0}</span>
							</Link>
						);
					})}
				</div>
			</LayoutGroup>
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
