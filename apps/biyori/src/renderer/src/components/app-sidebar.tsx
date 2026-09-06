import { desktopRpc } from "@/desktop-rpc";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { Button } from "@/mainview/components/ui/button";
import { useListFilterText } from "@/mainview/lib/list-filter";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";
import { ANIME_LIST_SEARCH_TAB } from "@/shared/list";
import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3Icon, CalendarDaysIcon, DownloadIcon, HistoryIcon, ListIcon, PlayIcon, SearchIcon } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { type ReactNode, useRef } from "react";

const listItems = [
	{ to: "/app/history", label: "History", icon: HistoryIcon },
	{ to: "/app/statistics", label: "Statistics", icon: BarChart3Icon },
] as const;

const toolItems = [
	{ to: "/app/search", label: "Search", icon: SearchIcon },
	{ to: "/app/seasons", label: "Seasons", icon: CalendarDaysIcon },
	{ to: "/app/torrents", label: "Torrents", icon: DownloadIcon },
] as const;

const navDestinations: string[] = ["/app/now-playing", "/app/anime-list", ...listItems.map((item) => item.to), ...toolItems.map((item) => item.to)];

const navPillSpring = { type: "spring", stiffness: 500, damping: 40 } as const;

function navItemClass(active: boolean): string {
	return cn(
		"relative flex w-full items-center gap-2 rounded-md py-1.5 pr-2 pl-4 text-left text-sm transition-colors",
		active ? "text-foreground" : "text-foreground/80 hover:bg-muted",
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
			className='pointer-events-none absolute top-1/2 left-1.5 mt-[-7px] h-3.5 w-1 rounded-full bg-primary'
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
		<nav aria-label='Main navigation' className='flex h-full min-h-0 w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-sidebar p-2'>
			<LayoutGroup id='app-sidebar-nav'>
				<div className='flex flex-col gap-0.5'>
					<NowPlayingNavLink active={pathname === "/app/now-playing"} isEnter={isEnter} />
				</div>
				<NavGroup label='Library'>
					<AnimeListNavLink active={pathname === "/app/anime-list"} isEnter={isEnter} />
					{listItems.map((item) => (
						<NavLink
							key={item.to}
							{...item}
							active={pathname === item.to}
							isEnter={isEnter}
							badge={item.to === "/app/history" ? queuedCount : undefined}
						/>
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
	parsed: { title: string; season: number | null; episode: number | null; group: string | null } | null;
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
			) : (
				<PlayIcon data-icon='inline-start' className={cn("relative", playing ? "fill-current text-success" : undefined)} />
			)}
			<span className='relative flex min-w-0 flex-1 flex-col items-start gap-0.5'>
				<span className='truncate'>Now Playing</span>
				{subLines.map((line, index) => (
					<span key={`${index}-${line}`} className='w-full truncate text-xs font-normal text-muted-foreground'>
						{line}
					</span>
				))}
			</span>
		</Button>
	);
}

function AnimeListNavLink({ active, isEnter }: { active: boolean; isEnter: boolean }) {
	const listFilter = useListFilterText();
	const searching = listFilter.trim().length > 0;
	return (
		<Link
			to='/app/anime-list'
			search={searching ? { tab: ANIME_LIST_SEARCH_TAB } : true}
			aria-current={active ? "page" : undefined}
			className={navItemClass(active)}>
			<ActiveNavPill active={active} isEnter={isEnter} />
			<ListIcon className='size-4 shrink-0 text-current' />
			<span className='flex-1 truncate'>Anime List</span>
		</Link>
	);
}

function NavLink({
	to,
	label,
	icon: Icon,
	badge,
	active,
	isEnter,
}: {
	to: string;
	label: string;
	icon: typeof PlayIcon;
	badge?: number;
	active: boolean;
	isEnter: boolean;
}) {
	return (
		<Link to={to} aria-current={active ? "page" : undefined} className={navItemClass(active)}>
			<ActiveNavPill active={active} isEnter={isEnter} />
			<Icon className='size-4 shrink-0 text-current' />
			<span className='flex-1 truncate'>{label}</span>
			{typeof badge === "number" && badge > 0 ? <span className='text-xs text-muted-foreground'>({badge})</span> : null}
		</Link>
	);
}
