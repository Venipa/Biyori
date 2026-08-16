import { desktopRpc } from "@/desktop-rpc";
import { useEffect } from "react";

const APP_CONTEXT_MENU_SELECTOR =
	"[data-slot=context-menu-trigger], [data-slot=context-menu-content]";

function isAppContextMenuTarget(target: EventTarget | null): boolean {
	return target instanceof Element && Boolean(target.closest(APP_CONTEXT_MENU_SELECTOR));
}

export function useDisableContextMenu() {
	useEffect(() => {
		const onContextMenu = (event: MouseEvent) => {
			if (event.defaultPrevented || isAppContextMenuTarget(event.target)) {
				return;
			}
			event.preventDefault();
			void desktopRpc.request.showDefaultContextMenu({});
		};
		document.addEventListener("contextmenu", onContextMenu);
		return () => {
			document.removeEventListener("contextmenu", onContextMenu);
		};
	}, []);
}
