import { cn } from "@renderer/lib/utils";
import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { AppToolbar } from "@/mainview/components/app-toolbar";
import { requestWindowClose } from "@/mainview/components/confirm-escape";
import Logo from "@/mainview/components/logo";
import { TopMenuBar } from "@/mainview/components/top-menu-bar";
import { ControlButton } from "@/mainview/components/ui/control-button";
import { trpc } from "@/mainview/trpc";

const INITIAL_CHROME = {
	maximized: false,
	focused: true,
	minimizable: true,
	maximizable: true,
	closable: true,
};

function chromeTitle(pathname: string): string {
	if (pathname.startsWith("/settings")) {
		return "Settings";
	}
	if (pathname.startsWith("/update")) {
		return "Update";
	}
	return "Biyori";
}

export function AppTitleBar() {
	const [chrome, setChrome] = useState(INITIAL_CHROME);
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const isOnboarding = pathname === "/onboarding";
	const isApp = pathname === "/app" || pathname.startsWith("/app/");
	const title = chromeTitle(pathname);
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
		<header className={cn("flex h-8 shrink-0 select-none items-stretch border-b bg-card", isOnboarding && "border-transparent bg-transparent")}>
			<div className='app-region-drag flex h-full items-center' onDoubleClick={maximizeFromDrag}>
				<Logo className='ml-3 size-4 shrink-0' />
			</div>
			{isApp ? (
				<>
					<TopMenuBar />
					<div className='app-region-drag min-w-0 flex-1 self-stretch' onDoubleClick={maximizeFromDrag} />
					<AppToolbar />
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
