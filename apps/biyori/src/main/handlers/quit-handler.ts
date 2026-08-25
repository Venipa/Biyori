import { is, platform } from "@electron-toolkit/utils";
import { app, type BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { log } from "../logger";
import { loadAppSettings, subscribeSettings } from "../settings";
import { windowManager } from "../windows";
import {
	isAppQuitting,
	markAppQuitting,
	shouldCancelWindowClose,
} from "./quit-policy";
import { setTrayState } from "./tray-state";

export { isAppQuitting } from "./quit-policy";

let cleanupPromise: Promise<void> | null = null;

async function ensureCleanup(): Promise<void> {
	if (!cleanupPromise) {
		cleanupPromise = (async () => {
			windowManager.destroyAll();
		})().catch((error) => {
			log.error("Error while running app cleanup during quit", error);
		});
	}
	return cleanupPromise;
}

async function finishQuit(then: () => void): Promise<void> {
	if (isAppQuitting()) {
		return;
	}
	markAppQuitting();
	await ensureCleanup();
	then();
}

function hideToTray(): void {
	setTrayState("hidden");
}

let closeToTrayEnabled = true;

function isCloseToTrayEnabled(): boolean {
	return closeToTrayEnabled;
}

function shouldHideToTray(forceQuit: boolean): boolean {
	return isCloseToTrayEnabled() && !forceQuit && !isAppQuitting();
}

export async function requestQuit(forceQuit: boolean = false): Promise<void> {
	if (shouldHideToTray(forceQuit)) {
		hideToTray();
		return;
	}
	await finishQuit(() => app.quit());
}

/** Persist cleanup, then relaunch. Skips tray minimize. */
export async function requestAppRelaunch(): Promise<void> {
	await finishQuit(() => {
		app.relaunch();
		app.exit(0);
	});
}

/** Cleanup once, then electron-updater install. Idempotent via `quitting`. */
export async function requestQuitAndInstall(): Promise<void> {
	await finishQuit(() => {
		autoUpdater.quitAndInstall(true, true);
	});
}

export function attachQuitHandler(window: BrowserWindow): void {
	void loadAppSettings().then((settings) => {
		closeToTrayEnabled = settings.closeToTray;
	});
	subscribeSettings((settings) => {
		closeToTrayEnabled = settings.closeToTray;
	});

	window.on("close", (ev) => {
		if (
			!shouldCancelWindowClose({
				quitting: isAppQuitting(),
				hideToTray: shouldHideToTray(false),
			})
		) {
			return;
		}
		if (shouldHideToTray(false)) {
			ev.preventDefault();
			hideToTray();
			return;
		}
		ev.preventDefault();
		void requestQuit(true);
	});

	app.on("before-quit", (ev) => {
		if (
			!shouldCancelWindowClose({
				quitting: isAppQuitting(),
				hideToTray: shouldHideToTray(false),
			})
		) {
			return;
		}
		if (shouldHideToTray(false)) {
			ev.preventDefault();
			hideToTray();
			return;
		}
		ev.preventDefault();
		void requestQuit(true);
	});

	app.on("window-all-closed", () => {
		if (!platform.isMacOS || isAppQuitting()) {
			void requestQuit(true);
		}
	});

	if (is.dev) {
		if (platform.isWindows) {
			process.on("message", (data) => {
				if (data === "graceful-exit") {
					void requestQuit(true);
				}
			});
		} else {
			process.on("SIGTERM", () => {
				void requestQuit(true);
			});
		}
	}
}
