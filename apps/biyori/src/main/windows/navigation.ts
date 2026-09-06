import { type BrowserWindow, shell } from "electron";
import { isAllowedRendererUrl, isHttpUrl } from "./renderer-url";

function denyOffAppNavigation(win: BrowserWindow, url: string, preventDefault: () => void): void {
	if (isAllowedRendererUrl(url)) {
		return;
	}
	preventDefault();
	if (isHttpUrl(url)) {
		void shell.openExternal(url).finally(() => {
			if (!win.isDestroyed()) {
				win.setEnabled(true);
			}
		});
	}
}

export function attachRendererNavigationGuard(win: BrowserWindow): void {
	win.webContents.on("will-navigate", (event) => {
		denyOffAppNavigation(win, event.url, () => event.preventDefault());
	});
	win.webContents.on("will-frame-navigate", (event) => {
		denyOffAppNavigation(win, event.url, () => event.preventDefault());
	});
	win.webContents.on("will-redirect", (event) => {
		denyOffAppNavigation(win, event.url, () => event.preventDefault());
	});
	win.webContents.on("will-attach-webview", (event) => {
		event.preventDefault();
	});
}
