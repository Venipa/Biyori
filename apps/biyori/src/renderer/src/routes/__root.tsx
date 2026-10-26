import { createRootRouteWithContext, Outlet, useMatches } from "@tanstack/react-router";
import { AnilistAuthSplash } from "@/mainview/components/app/onboarding/anilist-auth-splash";
import { ParentWindowScrim } from "@/mainview/components/app/shell/parent-window-scrim";
import { AppTitleBar } from "@/mainview/components/app/shell/titlebar";
import { useSettingsSync } from "@/mainview/lib/hooks/use-settings-sync";
import { useSyncUiLocale } from "@/mainview/lib/ui-locale";
import type { TrpcQueryUtils } from "@/mainview/trpc";

export const Route = createRootRouteWithContext<{ utils: TrpcQueryUtils }>()({
	component: RootLayout,
});

function RootLayout() {
	useSyncUiLocale();
	useSettingsSync();
	const chrome = useMatches({ select: (matches) => matches.findLast((match) => match.staticData.chrome)?.staticData.chrome });
	return (
		<div className='relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background'>
			{chrome === "none" ? null : <AppTitleBar />}
			<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
				<Outlet />
			</div>
			{chrome ? null : (
				<>
					<AnilistAuthSplash />
					<ParentWindowScrim />
				</>
			)}
		</div>
	);
}
