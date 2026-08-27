import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, Menu, Tray } from "electron";
import icon from "../../resources/icon.png?asset";
import { attachQuitHandler, requestQuit } from "./handlers/quit-handler";
import { attachTrayState, setTrayState } from "./handlers/tray-state";
import { logger } from "./logger";
import { boot, getDb, scheduleAfterInit } from "./services";
import { loadAppSettings } from "./settings";
import { isStartupLaunch, syncLoginItem } from "./startup";
import { initElectronTrpc } from "./trpc-handler";
import { windowManager } from "./windows";

if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	app.on("second-instance", () => {
		setTrayState("visible");
	});

	app.whenReady().then(async () => {
		electronApp.setAppUserModelId("net.venipa.biyori");

		app.on("browser-window-created", (_, window) => {
			optimizer.watchWindowShortcuts(window);
		});

		await boot();
		initElectronTrpc();
		const db = getDb();
		const bootSettings = await loadAppSettings(db);

		syncLoginItem(bootSettings);
		const hidden = isStartupLaunch() && bootSettings.autostartTray;
		const mainWindow = windowManager.open("main", {
			show: !hidden,
			skipTaskbar: hidden,
		});
		if (hidden) {
			mainWindow.hide();
			mainWindow.setSkipTaskbar(true);
		}
		attachTrayState(mainWindow);
		attachQuitHandler(mainWindow);

		const tray = new Tray(icon);
		tray.setToolTip("Biyori");
		tray.setContextMenu(
			Menu.buildFromTemplate([
				{ label: "Show", click: () => setTrayState("visible") },
				{ type: "separator" },
				{
					label: "Quit",
					click: () => {
						void requestQuit(true);
					},
				},
			]),
		);
		tray.on("click", () => setTrayState("visible"));

		scheduleAfterInit();
		logger.info("started");
	});
}
