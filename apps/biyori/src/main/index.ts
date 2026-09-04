import "./sentry";
import { logger } from "@biyori/logger";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, type BrowserWindow } from "electron";
import { clearActivity, reportStartup } from "./activity";
import { attachQuitHandler, isAppQuitting, requestQuit } from "./handlers/quit-handler";
import { createAppTray } from "./handlers/tray";
import { attachTrayState, setTrayState } from "./handlers/tray-state";
import { installBiyoriProtocol, startProtocolHandling } from "./protocol";
import { boot, scheduleAfterInit } from "./services";
import { loadAppSettings } from "./settings";
import { isStartupLaunch, syncLoginItem } from "./startup";
import { shouldStartInTray } from "./startup-login";
import { hasIndexedLibrary, runStartupScan } from "./track/library";
import { initElectronTrpc } from "./trpc-handler";
import { windowManager } from "./windows";

app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");

function attachMainWindow(mainWindow: BrowserWindow): void {
	attachTrayState(mainWindow);
	attachQuitHandler(mainWindow);
}

type WaitUntilPaintedOptions = {
	afterLoad?: boolean;
};
function waitUntilPainted(win: BrowserWindow, options: WaitUntilPaintedOptions = { afterLoad: false }): Promise<void> {
	return new Promise((resolve) => {
		let settled = false;
		const done = () => {
			if (settled || win.isDestroyed()) {
				return;
			}
			settled = true;
			resolve();
		};
		if (!options.afterLoad) win.once("ready-to-show", done); // ready-to-show is emitted before did-finish-load
		win.webContents.once("did-finish-load", done);
	});
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

async function runVisibleBoot(splash: BrowserWindow): Promise<void> {
	await waitUntilPainted(splash, { afterLoad: true });
	if (isAppQuitting() || splash.isDestroyed()) {
		return;
	}

	const checkLibrary = hasIndexedLibrary();
	if (checkLibrary) {
		reportStartup(0, 2, "Checking library");
	}
	const scan = checkLibrary ? runStartupScan() : Promise.resolve();

	const mainWindow = windowManager.open("main", {
		show: false,
		skipTaskbar: true,
		to: loadAppSettings().onboardingComplete ? undefined : "/onboarding",
	});
	const painted = waitUntilPainted(mainWindow);
	attachMainWindow(mainWindow);
	await painted;
	await scan;
	if (isAppQuitting() || mainWindow.isDestroyed()) {
		return;
	}
	if (checkLibrary) {
		reportStartup(2, 2, "Ready");
	}
	scheduleAfterInit();
	revealMain(splash, mainWindow);
}

if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	installBiyoriProtocol();

	app.whenReady().then(async () => {
		electronApp.setAppUserModelId("net.venipa.biyori");

		app.on("browser-window-created", (_, window) => {
			optimizer.watchWindowShortcuts(window);
		});

		await boot();
		initElectronTrpc();
		startProtocolHandling();
		const bootSettings = loadAppSettings();

		syncLoginItem(bootSettings);
		const hidden = shouldStartInTray(isStartupLaunch(), bootSettings.autostartTray);
		createAppTray(() => {
			void requestQuit(true);
		});

		const suppressActivateUntil = hidden ? Date.now() + 1500 : 0;
		app.on("activate", () => {
			if (Date.now() < suppressActivateUntil) {
				return;
			}
			setTrayState("visible");
		});

		if (hidden) {
			const mainWindow = windowManager.open("main", {
				show: false,
				skipTaskbar: true,
				to: bootSettings.onboardingComplete ? undefined : "/onboarding",
			});
			attachMainWindow(mainWindow);
			setTrayState("hidden");
			void runStartupScan();
			scheduleAfterInit();
			logger.info("started");
			return;
		}

		const splash = windowManager.open("splash");
		splash.on("closed", () => {
			if (isAppQuitting()) {
				return;
			}
			const main = windowManager.get("main");
			if (!main?.isVisible() || main?.isDestroyed()) {
				void requestQuit(true);
			}
		});
		void runVisibleBoot(splash).catch((error) => {
			logger.error("startup failed", error);
			const main = windowManager.get("main");
			if (main) {
				revealMain(splash, main);
			}
		});
		logger.info("started");
	});
}
