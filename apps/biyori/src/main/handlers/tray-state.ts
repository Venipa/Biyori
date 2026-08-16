import type { BrowserWindow } from "electron";

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

export function setTrayState(state: "visible" | "hidden"): void {
	if (!mainWindowRef || mainWindowRef.isDestroyed()) {
		return;
	}
	if (state === "visible") {
		if (!mainWindowRef.isVisible()) {
			mainWindowRef.show();
		}
		mainWindowRef.setSkipTaskbar(false);
		mainWindowRef.focus();
	} else if (state === "hidden") {
		if (mainWindowRef.isVisible()) {
			mainWindowRef.hide();
		}
		mainWindowRef.setSkipTaskbar(true);
	}
}
