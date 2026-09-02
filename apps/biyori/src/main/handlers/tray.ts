import { Menu, nativeImage, Tray } from "electron";
import icon from "../../../resources/icon.png?asset";
import { setTrayState, toggleTrayState } from "./tray-state";

let tray: Tray | null = null;

function trayMenu(onQuit: () => void): Electron.Menu {
	return Menu.buildFromTemplate([
		{ label: "Show", click: () => setTrayState("visible") },
		{ type: "separator" },
		{ label: "Quit", click: onQuit },
	]);
}

function trayImage(): Electron.NativeImage | string {
	const image = nativeImage.createFromPath(icon);
	if (image.isEmpty()) {
		return icon;
	}
	if (process.platform === "darwin") {
		return image.resize({ width: 16, height: 16 });
	}
	return image;
}

export function createAppTray(onQuit: () => void): Tray {
	destroyAppTray();
	const created = new Tray(trayImage());
	tray = created;
	created.setToolTip("Biyori");
	const menu = trayMenu(onQuit);

	if (process.platform === "darwin") {
		created.setIgnoreDoubleClickEvents(true);
		created.on("click", () => toggleTrayState());
		created.on("right-click", () => onQuit());
	} else {
		created.setContextMenu(menu);
		created.on("click", () => setTrayState("visible"));
	}

	return created;
}

export function destroyAppTray(): void {
	tray?.destroy();
	tray = null;
}
