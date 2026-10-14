import { platform } from "@electron-toolkit/utils";
import { app, type BrowserWindow } from "electron";
import { windowManager } from "../windows";
import { stealWindowFocus } from "../windows/manager";

let mainWindowRef: BrowserWindow | null = null;

export function attachTrayState(mainWindow: BrowserWindow): void {
	if (mainWindowRef) {
		throw new Error("Tray state handler already attached to a main window");
	}
	mainWindowRef = mainWindow;
	mainWindow.on("restore", () => {
		setTrayState("visible");
	});
}

export function toggleTrayState(): void {
	if (!mainWindowRef || mainWindowRef.isDestroyed()) {
		return;
	}
	const visible = mainWindowRef.isVisible() && !mainWindowRef.isMinimized();
	setTrayState(visible ? "hidden" : "visible");
}

export function setTrayState(state: "visible" | "hidden"): void {
	const splash = windowManager.get("splash");
	if (splash) {
		if (state === "visible") {
			stealWindowFocus(splash);
		}
		return;
	}
	if (!mainWindowRef || mainWindowRef.isDestroyed()) {
		return;
	}
	if (state === "visible") {
		if (platform.isMacOS) {
			mainWindowRef.setHiddenInMissionControl(false);
			app.dock?.show();
		}
		if (mainWindowRef.isMinimized()) {
			mainWindowRef.restore();
		}
		if (!mainWindowRef.isVisible()) {
			mainWindowRef.show();
		}
		if (!platform.isMacOS) {
			mainWindowRef.setSkipTaskbar(false);
		}
		mainWindowRef.focus();
		if (platform.isMacOS) {
			app.focus({ steal: true });
		}
	} else if (state === "hidden") {
		if (mainWindowRef.isVisible()) {
			mainWindowRef.hide();
		}
		if (platform.isMacOS) {
			mainWindowRef.setHiddenInMissionControl(true);
		} else {
			mainWindowRef.setSkipTaskbar(true);
		}
	}
}
