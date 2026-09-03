import { createFileRoute, Navigate, Outlet, useBlocker, useNavigate } from "@tanstack/react-router";
import { type ReactElement, useRef } from "react";
import { AnimeDeleteDialog } from "@/mainview/components/anime-delete-dialog";
import { AppAnimeInfoDialog } from "@/mainview/components/app-anime-info-dialog";
import { AppSidebar } from "@/mainview/components/app-sidebar";
import { AppStatusBar } from "@/mainview/components/app-status-bar";
import { AppToolbar } from "@/mainview/components/app-toolbar";
import { TopMenuBar } from "@/mainview/components/top-menu-bar";
import { WatchConfirmDialog } from "@/mainview/components/watch-confirm-dialog";
import { PageLoad } from "@/mainview/components/page-load";
import { invalidateAnimeQueries } from "@/mainview/lib/invalidate-anime";
import { trpc } from "@/mainview/trpc";

export const Route = createFileRoute("/app")({
	component: MainLayout,
});

function MainLayout(): ReactElement {
	useBlocker({
		shouldBlockFn: ({ next }) => next.fullPath === "/update",
		enableBeforeUnload: false,
	});
	const utils = trpc.useUtils();
	const navigate = useNavigate();
	const settingsQuery = trpc.settings.get.useQuery();
	const lastPlayKey = useRef("");
	const lastProgressRevision = useRef(0);
	trpc.media.onNowPlaying.useSubscription(undefined, {
		onData: (snapshot) => {
			utils.media.nowPlaying.setData(undefined, snapshot);
			if (snapshot.progressRevision > lastProgressRevision.current) {
				lastProgressRevision.current = snapshot.progressRevision;
				void invalidateAnimeQueries(utils, "watched", snapshot.match?.id);
			}
			const settings = settingsQuery.data;
			if (!settings || !snapshot.media) {
				lastPlayKey.current = "";
				return;
			}
			const key = `${snapshot.media.player}|${snapshot.media.title}|${snapshot.match?.id ?? "none"}|${snapshot.unrecognized}`;
			if (key === lastPlayKey.current) {
				return;
			}
			lastPlayKey.current = key;
			const goRecognized = Boolean(snapshot.match) && settings.goToNowPlayingOnRecognized;
			const goUnrecognized = snapshot.unrecognized && settings.goToNowPlayingOnUnrecognized;
			if (goRecognized || goUnrecognized) {
				void navigate({ to: "/app/now-playing" });
			}
		},
	});

	if (settingsQuery.data && !settingsQuery.data.onboardingComplete) {
		return <Navigate to='/onboarding' />;
	}

	return (
		<PageLoad loading={!settingsQuery.data}>
			<div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground'>
				<TopMenuBar />
				<AppToolbar />
				<div className='flex min-h-0 flex-1 overflow-hidden'>
					<AppSidebar />
					<main className='min-h-0 min-w-0 flex-1 overflow-hidden'>
						<Outlet />
					</main>
				</div>
				<AppStatusBar />
				<AppAnimeInfoDialog />
				<AnimeDeleteDialog />
				<WatchConfirmDialog />
			</div>
		</PageLoad>
	);
}
