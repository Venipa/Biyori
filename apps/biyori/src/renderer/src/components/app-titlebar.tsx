import { useState } from "react";
import { requestWindowClose } from "@/mainview/components/confirm-escape";
import Logo from "@/mainview/components/logo";
import { ControlButton } from "@/mainview/components/ui/control-button";
import { trpc } from "@/mainview/trpc";

export type AppTitleBarProps = {
	title: string;
};

const INITIAL_CHROME = {
	maximized: false,
	focused: true,
	minimizable: true,
	maximizable: true,
	closable: true,
};

export function AppTitleBar({ title }: AppTitleBarProps) {
	const [chrome, setChrome] = useState(INITIAL_CHROME);
	const minimizeWindow = trpc.desktop.minimizeWindow.useMutation();
	const toggleMaximizeWindow = trpc.desktop.toggleMaximizeWindow.useMutation();
	const closeWindow = trpc.desktop.closeWindow.useMutation();
	trpc.desktop.onWindowState.useSubscription(undefined, {
		onData: setChrome,
	});

	const inactive = !chrome.focused;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: frameless drag region, double-click maximizes
		<header
			className='app-region-drag flex h-8 shrink-0 select-none items-center border-b bg-card'
			onDoubleClick={() => {
				if (!chrome.maximizable) {
					return;
				}
				toggleMaximizeWindow.mutate();
			}}>
			<Logo className='size-4 ml-3' />
			<p className='min-w-0 flex-1 truncate px-2 text-xs font-medium text-foreground'>{title}</p>
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
