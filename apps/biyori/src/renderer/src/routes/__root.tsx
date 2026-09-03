import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AnilistAuthSplash } from "@/mainview/components/anilist-auth-splash";
import { AppTitleBar } from "@/mainview/components/app-titlebar";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const splash = useRouterState({ select: (state) => state.location.pathname === "/splash" });
	return (
		<div className='relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background'>
			{splash ? null : <AppTitleBar />}
			<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
				<Outlet />
			</div>
			<AnilistAuthSplash />
		</div>
	);
}
