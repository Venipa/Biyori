import { CopyIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { desktopRpc } from "@/desktop-rpc";
import Logo from "@/mainview/components/logo";
import { cn } from "@/mainview/lib/utils";

export type AppTitleBarProps = {
	title: string;
};

export function AppTitleBar({ title }: AppTitleBarProps) {
	const [maximized, setMaximized] = useState(false);

	useEffect(() => {
		void desktopRpc.request.windowState().then((state) => {
			setMaximized(state.maximized);
		});
	}, []);

	return (
		<div
			className='app-region-drag  flex h-8 shrink-0 select-none items-center border-b bg-card'
			onDoubleClick={() => {
				void desktopRpc.request.toggleMaximizeWindow({}).then((state) => {
					setMaximized(state.maximized);
				});
			}}>
			<Logo className='size-4 ml-3' />
			<p className='min-w-0 flex-1 truncate px-2 text-xs font-medium text-foreground'>{title}</p>
			<div
				className='app-region-no-drag flex h-full shrink-0'
				onDoubleClick={(event) => {
					event.stopPropagation();
				}}>
				<button
					type='button'
					className={cn("flex h-full w-11 items-center justify-center text-muted-foreground", "hover:bg-muted hover:text-foreground")}
					aria-label='Minimize'
					onClick={() => {
						void desktopRpc.request.minimizeWindow({});
					}}>
					<MinusIcon className='size-3.5' />
				</button>
				<button
					type='button'
					className={cn("flex h-full w-11 items-center justify-center text-muted-foreground", "hover:bg-muted hover:text-foreground")}
					aria-label={maximized ? "Restore" : "Maximize"}
					onClick={() => {
						void desktopRpc.request.toggleMaximizeWindow({}).then((state) => {
							setMaximized(state.maximized);
						});
					}}>
					{maximized ? <CopyIcon className='size-3.5' /> : <SquareIcon className='size-3' />}
				</button>
				<button
					type='button'
					className={cn("flex h-full w-11 items-center justify-center text-muted-foreground", "hover:bg-destructive hover:text-white")}
					aria-label='Close'
					onClick={() => {
						void desktopRpc.request.closeWindow({});
					}}>
					<XIcon className='size-3.5' />
				</button>
			</div>
		</div>
	);
}
