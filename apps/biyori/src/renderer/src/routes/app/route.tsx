import { createFileRoute, Navigate, Outlet, useBlocker } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { AnimeDeleteDialog } from "@/mainview/components/app/anime-info/delete-dialog";
import { AppAnimeInfoDialog } from "@/mainview/components/app/anime-info/host";
import { WatchConfirmDialog } from "@/mainview/components/app/confirm/watch-dialog";
import { PageLoad } from "@/mainview/components/app/shell/page-load";
import { AppSidebar } from "@/mainview/components/app/shell/sidebar";
import { AppStatusBar } from "@/mainview/components/app/shell/status-bar";
import { TooltipProvider } from "@/mainview/components/ui/tooltip";
import { useAppLiveSync } from "@/mainview/lib/hooks/use-app-live-sync";
import { trpc } from "@/mainview/trpc";

export const Route = createFileRoute("/app")({
	component: MainLayout,
});

function MainLayout(): ReactElement {
	useBlocker({
		shouldBlockFn: ({ next }) => next.fullPath === "/update",
		enableBeforeUnload: false,
	});
	useAppLiveSync();
	const settingsQuery = trpc.settings.get.useQuery();

	if (settingsQuery.data?.onboardingComplete === false) {
		return <Navigate to='/onboarding' />;
	}

	return (
		<PageLoad loading={settingsQuery.isPending}>
			<TooltipProvider delay={400}>
				<div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground'>
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
			</TooltipProvider>
		</PageLoad>
	);
}
