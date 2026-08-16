import { AnimeDeleteDialog } from "@/mainview/components/anime-delete-dialog";
import { AppAnimeInfoDialog } from "@/mainview/components/app-anime-info-dialog";
import { AppSidebar } from "@/mainview/components/app-sidebar";
import { AppStatusBar } from "@/mainview/components/app-status-bar";
import { AppToolbar } from "@/mainview/components/app-toolbar";
import { TopMenuBar } from "@/mainview/components/top-menu-bar";
import { WatchConfirmDialog } from "@/mainview/components/watch-confirm-dialog";
import { trpc } from "@/mainview/trpc";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";

export const Route = createFileRoute("/app")({
	component: MainLayout,
});

function MainLayout() {
	const utils = trpc.useUtils();
	const navigate = useNavigate();
	const settingsQuery = trpc.settings.get.useQuery();
	const lastPlayKey = useRef("");
	trpc.media.onNowPlaying.useSubscription(undefined, {
		onData: (snapshot) => {
			utils.media.nowPlaying.setData(undefined, snapshot);
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
			const goRecognized =
				Boolean(snapshot.match) && settings.goToNowPlayingOnRecognized;
			const goUnrecognized =
				snapshot.unrecognized && settings.goToNowPlayingOnUnrecognized;
			if (goRecognized || goUnrecognized) {
				void navigate({ to: "/app/now-playing" });
			}
		},
	});

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
			<TopMenuBar />
			<AppToolbar />
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<AppSidebar />
				<main className="min-h-0 min-w-0 flex-1 overflow-hidden">
					<Outlet />
				</main>
			</div>
			<AppStatusBar />
			<AppAnimeInfoDialog />
			<AnimeDeleteDialog />
			<WatchConfirmDialog />
		</div>
	);
}
