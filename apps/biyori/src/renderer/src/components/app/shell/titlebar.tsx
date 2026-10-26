import { useTranslation } from "@biyori/translations/react";
import { cn } from "@renderer/lib/utils";
import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { requestWindowClose } from "@/mainview/components/app/shell/confirm-escape";
import Logo from "@/mainview/components/app/shell/logo";
import { TitleSearch } from "@/mainview/components/app/shell/title-search";
import { AppToolbar } from "@/mainview/components/app/shell/toolbar";
import { TopMenuBar } from "@/mainview/components/app/shell/top-menu-bar";
import { ControlButton } from "@/mainview/components/ui/control-button";
import { trpc } from "@/mainview/trpc";

const INITIAL_CHROME = {
	maximized: false,
	focused: true,
	minimizable: true,
	maximizable: true,
	closable: true,
};

export function AppTitleBar() {
	const { t } = useTranslation();
	const [chrome, setChrome] = useState(INITIAL_CHROME);
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const isOnboarding = pathname === "/onboarding";
	const isApp = pathname === "/app" || pathname.startsWith("/app/");
	const title = pathname.startsWith("/settings") ? t("shell.settings") : pathname.startsWith("/update") ? t("shell.update") : t("shell.biyori");
	const minimizeWindow = trpc.desktop.minimizeWindow.useMutation();
	const toggleMaximizeWindow = trpc.desktop.toggleMaximizeWindow.useMutation();
	const closeWindow = trpc.desktop.closeWindow.useMutation();
	trpc.desktop.onWindowState.useSubscription(undefined, {
		onData: setChrome,
	});

	const inactive = !chrome.focused;

	function maximizeFromDrag(): void {
		if (!chrome.maximizable) {
			return;
		}
		toggleMaximizeWindow.mutate();
	}

	return (
		<header className={cn("relative flex h-8 shrink-0 select-none items-stretch border-b bg-card", isOnboarding && "border-transparent bg-transparent")}>
			<div className='app-region-drag flex h-full items-center' onDoubleClick={maximizeFromDrag}>
				<Logo className='ml-3 size-4 shrink-0' />
			</div>
			{isApp ? (
				<>
					<TopMenuBar />
					<div className='app-region-drag min-w-0 flex-1 self-stretch' onDoubleClick={maximizeFromDrag} />
					<AppToolbar />
					<div className='app-region-no-drag absolute top-1/2 left-1/2 z-40 w-96 max-w-[40vw] -translate-x-1/2 -translate-y-1/2'>
						<TitleSearch />
					</div>
				</>
			) : (
				<p className='app-region-drag min-w-0 flex-1 self-center truncate px-2 text-xs font-medium text-foreground' onDoubleClick={maximizeFromDrag}>
					{title}
				</p>
			)}
			<div className='app-region-no-drag flex h-full shrink-0'>
				<ControlButton
					control='minimize'
					inactive={inactive}
					disabled={!chrome.minimizable}
					onClick={() => {
						minimizeWindow.mutate();
					}}
				/>
				{chrome.maximizable ? (
					<ControlButton
						control='maximize'
						maximized={chrome.maximized}
						inactive={inactive}
						onClick={() => {
							toggleMaximizeWindow.mutate();
						}}
					/>
				) : null}
				<ControlButton
					control='close'
					inactive={inactive}
					disabled={!chrome.closable}
					onClick={() => {
						requestWindowClose(() => {
							closeWindow.mutate();
						});
					}}
				/>
			</div>
		</header>
	);
}
