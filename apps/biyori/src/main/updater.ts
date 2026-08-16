import { observable } from "@trpc/server/observable";
import { is } from "@electron-toolkit/utils";
import { app } from "electron";
import { autoUpdater } from "electron-updater";

export const UPDATE_GITHUB_REPO = "Venipa/biyori";
export const UPDATE_STABLE_BASE_URL = `https://github.com/${UPDATE_GITHUB_REPO}/releases/latest/download`;

export type AppUpdatePhase =
	| "idle"
	| "checking"
	| "up-to-date"
	| "available"
	| "downloading"
	| "ready"
	| "error"
	| "dev";

export type AppUpdateState = {
	phase: AppUpdatePhase;
	localVersion: string;
	localChannel: string;
	localHash: string;
	remoteVersion: string | null;
	remoteHash: string | null;
	updateAvailable: boolean;
	updateReady: boolean;
	message: string;
	error: string | null;
};

type Listener = (state: AppUpdateState) => void;

const listeners = new Set<Listener>();

let state: AppUpdateState = {
	phase: "idle",
	localVersion: "",
	localChannel: "",
	localHash: "",
	remoteVersion: null,
	remoteHash: null,
	updateAvailable: false,
	updateReady: false,
	message: "",
	error: null,
};

let checking = false;
let downloading = false;
let statusHooked = false;

function emit(next: AppUpdateState): void {
	state = next;
	for (const listener of listeners) {
		listener(state);
	}
}

function patch(partial: Partial<AppUpdateState>): void {
	emit({ ...state, ...partial });
}

function localChannel(): string {
	return is.dev ? "dev" : app.getVersion().includes("canary") ? "canary" : "stable";
}

export function getUpdateState(): AppUpdateState {
	return state;
}

export function subscribeUpdateState(listener: Listener): () => void {
	listeners.add(listener);
	listener(state);
	return () => {
		listeners.delete(listener);
	};
}

export function updateStateObservable() {
	return observable<AppUpdateState>((emitObs) => {
		return subscribeUpdateState((next) => {
			emitObs.next(next);
		});
	});
}

function hookStatus(): void {
	if (statusHooked) {
		return;
	}
	statusHooked = true;
	autoUpdater.on("checking-for-update", () => {
		patch({ phase: "checking", message: "Checking for updates...", error: null });
	});
	autoUpdater.on("update-available", (info) => {
		patch({
			phase: "available",
			updateAvailable: true,
			remoteVersion: info.version,
			message: `Update available: ${info.version}`,
			error: null,
		});
	});
	autoUpdater.on("update-not-available", (info) => {
		patch({
			phase: "up-to-date",
			updateAvailable: false,
			remoteVersion: info.version,
			message: "You are up to date",
			error: null,
		});
	});
	autoUpdater.on("download-progress", () => {
		patch({ phase: "downloading", message: "Downloading update...", error: null });
	});
	autoUpdater.on("update-downloaded", (info) => {
		patch({
			phase: "ready",
			updateAvailable: true,
			updateReady: true,
			remoteVersion: info.version,
			message: "Update downloaded. Restart to apply.",
			error: null,
		});
	});
	autoUpdater.on("error", (error) => {
		const message = error instanceof Error ? error.message : String(error);
		patch({ phase: "error", error: message, message });
	});
}

export async function refreshLocalUpdateInfo(): Promise<AppUpdateState> {
	patch({
		localVersion: app.getVersion(),
		localChannel: localChannel(),
		localHash: "",
	});
	return state;
}

export async function checkForAppUpdate(): Promise<AppUpdateState> {
	if (checking) {
		return state;
	}
	checking = true;
	hookStatus();
	try {
		await refreshLocalUpdateInfo();
		if (is.dev) {
			patch({
				phase: "dev",
				updateAvailable: false,
				updateReady: false,
				remoteVersion: null,
				remoteHash: null,
				message: "Dev builds skip updates",
			});
			return state;
		}
		await autoUpdater.checkForUpdates();
		return state;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Update check failed";
		patch({
			phase: "error",
			error: message,
			message,
			updateAvailable: false,
			updateReady: false,
		});
		return state;
	} finally {
		checking = false;
	}
}

export async function downloadAppUpdate(): Promise<AppUpdateState> {
	if (downloading) {
		return state;
	}
	downloading = true;
	hookStatus();
	try {
		if (is.dev) {
			patch({
				phase: "dev",
				message: "Dev builds skip updates",
			});
			return state;
		}
		patch({
			phase: "downloading",
			message: "Downloading update...",
			error: null,
		});
		await autoUpdater.downloadUpdate();
		return state;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Download failed";
		patch({
			phase: "error",
			error: message,
			message,
		});
		return state;
	} finally {
		downloading = false;
	}
}

export async function applyAppUpdate(): Promise<void> {
	if (!state.updateReady) {
		throw new Error("Update is not ready");
	}
	patch({
		phase: "ready",
		message: "Restarting to apply update...",
	});
	const { requestQuitAndInstall } = await import("./handlers/quit-handler");
	await requestQuitAndInstall();
}
