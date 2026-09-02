import { logger } from "@biyori/logger";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, type BrowserWindow, Menu, Tray } from "electron";
import icon from "../../resources/icon.png?asset";
import { clearActivity, upsertActivity } from "./activity";
import { attachQuitHandler, isAppQuitting, requestQuit } from "./handlers/quit-handler";
import { attachTrayState, setTrayState } from "./handlers/tray-state";
import { boot, scheduleAfterInit } from "./services";
import { loadAppSettings } from "./settings";
import { isStartupLaunch, syncLoginItem } from "./startup";
import { hasIndexedLibrary, runStartupScan } from "./track/library";
import { initElectronTrpc } from "./trpc-handler";
import { windowManager } from "./windows";

app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");

function attachMainWindow(mainWindow: BrowserWindow): void {
	attachTrayState(mainWindow);
	attachQuitHandler(mainWindow);
}

function waitUntilPainted(win: BrowserWindow): Promise<void> {
	return new Promise((resolve) => {
		let settled = false;
		const done = () => {
			if (settled || win.isDestroyed()) {
				return;
			}
			settled = true;
			resolve();
		};
		win.once("ready-to-show", done);
		win.webContents.once("did-finish-load", done);
	});
}

function reportStartup(current: number, total: number, label: string): void {
	upsertActivity({ source: "startup", title: label, body: `${current}/${total}` });
}

function revealMain(splash: BrowserWindow, mainWindow: BrowserWindow): void {
	if (isAppQuitting() || mainWindow.isDestroyed()) {
		return;
	}
	clearActivity("startup");
	mainWindow.setSkipTaskbar(false);
	mainWindow.show();
	mainWindow.focus();
	if (!splash.isDestroyed()) {
		windowManager.close("splash");
	}
}

async function runVisibleBoot(splash: BrowserWindow, mainWindow: BrowserWindow, painted: Promise<void>): Promise<void> {
	const checkLibrary = hasIndexedLibrary();
	const total = checkLibrary ? 2 : 1;
	reportStartup(0, total, "Loading window");
	await painted;
	if (isAppQuitting() || mainWindow.isDestroyed()) {
		return;
	}
	reportStartup(1, total, checkLibrary ? "Checking library" : "Ready");
	if (checkLibrary) {
		await runStartupScan();
		if (isAppQuitting() || mainWindow.isDestroyed()) {
			return;
		}
		reportStartup(2, total, "Ready");
	}
	scheduleAfterInit();
	revealMain(splash, mainWindow);
}

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
		const bootSettings = loadAppSettings();

		syncLoginItem(bootSettings);
		const hidden = isStartupLaunch() && bootSettings.autostartTray;

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

		if (hidden) {
			const mainWindow = windowManager.open("main", {
				show: false,
				skipTaskbar: true,
			});
			mainWindow.hide();
			mainWindow.setSkipTaskbar(true);
			attachMainWindow(mainWindow);
			void runStartupScan();
			scheduleAfterInit();
			logger.info("started");
			return;
		}

		const splash = windowManager.open("splash");
		const mainWindow = windowManager.open("main", {
			show: false,
			skipTaskbar: true,
		});
		attachMainWindow(mainWindow);
		const painted = waitUntilPainted(mainWindow);
		splash.on("closed", () => {
			if (isAppQuitting()) {
				return;
			}
			if (mainWindow.isDestroyed() || !mainWindow.isVisible()) {
				void requestQuit(true);
			}
		});
		void runVisibleBoot(splash, mainWindow, painted).catch((error) => {
			logger.error("startup failed", error);
			revealMain(splash, mainWindow);
		});
		logger.info("started");
	});
}
