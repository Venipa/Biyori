import "./user-data";
import "./sentry";
import { logger } from "@biyori/logger";
import { t } from "@biyori/translations/i18n";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, type BrowserWindow, dialog } from "electron";
import { handleMediaProtocol, registerMediaScheme } from "./covers/protocol";
import { attachQuitHandler, isAppQuitting, requestQuit } from "./handlers/quit-handler";
import { createAppTray } from "./handlers/tray";
import { attachTrayState, setTrayState } from "./handlers/tray-state";
import { installBiyoriProtocol, startProtocolHandling } from "./protocol";
import { boot, scheduleAfterInit } from "./services";
import { loadAppSettings } from "./settings";
import { isStartupLaunch, syncLoginItem } from "./startup";
import { shouldStartInTray } from "./startup-login";
import { beginStep, endStep, failActiveSteps } from "./startup-status";
import { runStartupScan } from "./track/library";
import { initElectronTrpc } from "./trpc-handler";
import { startUiLocaleSync } from "./ui-locale";
import { windowManager } from "./windows";

app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
registerMediaScheme();

const PAINT_TIMEOUT_MS = 15_000;

/** Resolves once the window painted, failed to load, died or closed, so startup never hangs on it. */
function waitUntilPainted(win: BrowserWindow, options: { afterLoad?: boolean } = {}): Promise<void> {
	return new Promise((resolve) => {
		let settled = false;
		const done = () => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			resolve();
		};
		const timer = setTimeout(done, PAINT_TIMEOUT_MS);
		if (win.isDestroyed()) {
			done();
			return;
		}
		if (!options.afterLoad) win.once("ready-to-show", done); // ready-to-show is emitted before did-finish-load
		win.once("closed", done);
		win.webContents.once("did-finish-load", done);
		win.webContents.once("did-fail-load", done);
		win.webContents.once("render-process-gone", done);
	});
}

function openMainHidden(): BrowserWindow {
	const mainWindow = windowManager.open("main", {
		show: false,
		skipTaskbar: true,
		to: loadAppSettings().onboardingComplete ? undefined : "/onboarding",
	});
	attachTrayState(mainWindow);
	attachQuitHandler(mainWindow);
	return mainWindow;
}

function revealMain(mainWindow: BrowserWindow): void {
	if (isAppQuitting() || mainWindow.isDestroyed()) {
		return;
	}
	mainWindow.setSkipTaskbar(false);
	mainWindow.show();
	mainWindow.focus();
	const splash = windowManager.get("splash");
	if (splash && !splash.isDestroyed()) {
		windowManager.close("splash");
	}
}

function openSplash(): BrowserWindow {
	const splash = windowManager.open("splash");
	splash.on("closed", () => {
		if (isAppQuitting()) {
			return;
		}
		const main = windowManager.get("main");
		if (!main || main.isDestroyed() || !main.isVisible()) {
			void requestQuit(true);
		}
	});
	return splash;
}

async function start(): Promise<void> {
	electronApp.setAppUserModelId("net.venipa.biyori");
	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	const settings = loadAppSettings();
	const hidden = shouldStartInTray(isStartupLaunch(), settings.autostartTray);

	// trpc before services so the splash can stream their boot; tray launches skip the splash
	initElectronTrpc();
	if (!hidden) {
		await waitUntilPainted(openSplash(), { afterLoad: true });
	}

	await boot();
	handleMediaProtocol();
	startUiLocaleSync();
	startProtocolHandling();
	syncLoginItem(settings);
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

	beginStep("window", t("main.startup.window"));
	const mainWindow = openMainHidden();
	// subscribe before the scan so ready-to-show is not missed
	const painted = hidden ? Promise.resolve() : waitUntilPainted(mainWindow);
	if (isStartupLaunch()) {
		// login launch: get to the tray/window fast, progress shows in the activity center
		void runStartupScan();
	} else {
		beginStep("library", t("main.startup.checkingLibrary"));
		await runStartupScan();
		endStep("library");
	}
	if (hidden) {
		setTrayState("hidden");
	}
	await painted;
	endStep("window");
	scheduleAfterInit();
	if (!hidden) {
		revealMain(mainWindow);
	}
	logger.info("started");
}

if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	installBiyoriProtocol();

	app
		.whenReady()
		.then(start)
		.catch((error: unknown) => {
			logger.error("startup failed", error);
			const message = error instanceof Error ? error.message : String(error);
			failActiveSteps(message);
			dialog.showErrorBox(t("main.startup.failed"), message);
			app.exit(1);
		});
}
