import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3Icon, CalendarDaysIcon, DownloadIcon, HistoryIcon, ListIcon, PlayIcon, SearchIcon } from "lucide-react";
import { desktopRpc } from "@/desktop-rpc";
import { AnimeCover } from "@/mainview/components/anime-cover";
import { Button } from "@/mainview/components/ui/button";
import { useUpdateStatus } from "@/mainview/lib/update-status";
import { cn } from "@/mainview/lib/utils";
import { trpc } from "@/mainview/trpc";

const listItems = [
	{ to: "/app/anime-list", label: "Anime List", icon: ListIcon },
	{ to: "/app/history", label: "History", icon: HistoryIcon },
	{ to: "/app/statistics", label: "Statistics", icon: BarChart3Icon },
] as const;

const toolItems = [
	{ to: "/app/search", label: "Search", icon: SearchIcon },
	{ to: "/app/seasons", label: "Seasons", icon: CalendarDaysIcon },
	{ to: "/app/torrents", label: "Torrents", icon: DownloadIcon },
] as const;

export function AppSidebar() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const historyQuery = trpc.history.queuedCount.useQuery(undefined, {
		refetchInterval: (query) => ((query.state.data ?? 0) > 0 ? 3_000 : false),
	});
	const queuedCount = historyQuery.data ?? 0;
	const update = useUpdateStatus();

	return (
		<nav aria-label='Main navigation' className='flex h-full min-h-0 w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-sidebar p-2'>
			<div className='flex flex-col gap-0.5'>
				<NowPlayingNavLink active={pathname === "/app/now-playing"} />
			</div>
			<div className='flex flex-col gap-0.5 border-t pt-2'>
				{listItems.map((item) => (
					<NavLink key={item.to} {...item} active={pathname === item.to} badge={item.to === "/app/history" ? queuedCount : undefined} />
				))}
			</div>
			<div className='flex flex-col gap-0.5 border-t pt-2'>
				{toolItems.map((item) => (
					<NavLink key={item.to} {...item} active={pathname === item.to} />
				))}
			</div>
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

function NowPlayingNavLink({ active }: { active: boolean }) {
	const snapshot = trpc.media.nowPlaying.useQuery().data;
	const playing = Boolean(snapshot?.media);
	const title = snapshot?.match?.title ?? snapshot?.parsed?.title ?? null;
	const episode = snapshot?.parsed?.episode;
	const subtitle = title ? (episode != null ? `${title} - Ep ${episode}` : title) : null;
	const coverId = snapshot?.match?.id;
	const coverUrl = snapshot?.match?.coverUrl;

	return (
		<Link
			to='/app/now-playing'
			aria-current={active ? "page" : undefined}
			className={cn(
				"relative isolate flex w-full overflow-hidden rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
				active ? "border-accent-foreground/15 bg-accent text-accent-foreground" : "border-transparent text-foreground/80 hover:bg-muted",
			)}>
			{playing && coverId ? (
				<span aria-hidden className='pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]'>
					<span className='absolute top-1/2 left-0 h-[220%] w-24 origin-left -translate-y-1/2 overflow-hidden blur-[8px] saturate-150 [mask-image:linear-gradient(to_right,black_10%,transparent_78%)]'>
						<AnimeCover id={coverId} coverUrl={coverUrl || undefined} alt='' className='size-full' />
					</span>
				</span>
			) : null}
			<span className='relative z-10 flex min-w-0 w-full items-center gap-2'>
				<PlayIcon className={cn("size-4 shrink-0 text-current", playing && "fill-current")} />
				<span className='flex min-w-0 flex-1 flex-col'>
					<span className='truncate'>Now Playing</span>
					{playing && subtitle ? <span className='truncate text-[11px] leading-tight text-current/70'>{subtitle}</span> : null}
				</span>
			</span>
		</Link>
	);
}

function NavLink({ to, label, icon: Icon, badge, active }: { to: string; label: string; icon: typeof PlayIcon; badge?: number; active: boolean }) {
	return (
		<Link
			to={to}
			aria-current={active ? "page" : undefined}
			className={cn(
				"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
				active ? "border border-accent-foreground/15 bg-accent text-accent-foreground" : "border border-transparent text-foreground/80 hover:bg-muted",
			)}>
			<Icon className='size-4 shrink-0 text-current' />
			<span className='flex-1 truncate'>{label}</span>
			{typeof badge === "number" && badge > 0 ? <span className='text-xs text-muted-foreground'>({badge})</span> : null}
		</Link>
	);
}
