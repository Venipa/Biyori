import { is } from "@electron-toolkit/utils";
import { observable } from "@trpc/server/observable";
import { app } from "electron";
import { autoUpdater } from "electron-updater";
import { channelWantsPrerelease, type GithubRelease, parseGithubChangelog, sanitizeUpdateError } from "./github-releases";
import { requestQuitAndInstall } from "./handlers/quit-handler";
import { trackedFetch } from "./http-stats";
import { log } from "./logger";

export const UPDATE_GITHUB_REPO = "Venipa/biyori";
export const UPDATE_STABLE_BASE_URL = `https://github.com/${UPDATE_GITHUB_REPO}/releases/latest/download`;

export type ChangelogResult = { ok: true; items: GithubRelease[] } | { ok: false; error: string };

export type AppUpdatePhase = "idle" | "checking" | "up-to-date" | "available" | "downloading" | "ready" | "error" | "dev";

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
	if (is.dev) {
		return "dev";
	}
	const baked = import.meta.env.VITE_APP_UPDATE_CHANNEL;
	if (baked) {
		return baked;
	}
	return app.getVersion().includes("-") ? "rc" : "stable";
}

function githubRepo(): { owner: string; repo: string } {
	const owner = import.meta.env.VITE_REPO_OWNER;
	const repo = import.meta.env.VITE_REPO_NAME;
	if (owner && repo) {
		return { owner, repo };
	}
	const [fallbackOwner, fallbackRepo] = UPDATE_GITHUB_REPO.split("/");
	return { owner: fallbackOwner ?? "Venipa", repo: fallbackRepo ?? "biyori" };
}

function configureUpdater(): void {
	const { owner, repo } = githubRepo();
	autoUpdater.setFeedURL({ provider: "github", owner, repo });
	autoUpdater.autoDownload = false;
	autoUpdater.allowPrerelease = channelWantsPrerelease(localChannel());
}

function applyUpdateError(error: unknown, fallback: string): void {
	log.error("updater", error);
	const message = sanitizeUpdateError(error, fallback);
	patch({
		phase: "error",
		error: message,
		message,
		updateAvailable: false,
		updateReady: false,
	});
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
		applyUpdateError(error, "Update check failed");
	});
}

export async function refreshLocalUpdateInfo(): Promise<AppUpdateState> {
	patch({
		localVersion: app.getVersion(),
		localChannel: localChannel(),
		localHash: import.meta.env.VITE_APP_GIT_HASH ?? "",
	});
	return state;
}

export async function loadChangelog(): Promise<ChangelogResult> {
	const { owner, repo } = githubRepo();
	const channel = localChannel();
	try {
		const response = await trackedFetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=20`, {
			headers: {
				Accept: "application/vnd.github+json",
				"User-Agent": "biyori",
			},
		});
		const payload: unknown = await response.json();
		if (!response.ok) {
			return { ok: false, error: "Could not load changelog" };
		}
		return parseGithubChangelog(payload, channel);
	} catch {
		return { ok: false, error: "Could not load changelog" };
	}
}

export async function checkForAppUpdate(): Promise<AppUpdateState> {
	if (checking) {
		return state;
	}
	checking = true;
	hookStatus();
	configureUpdater();
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
		applyUpdateError(error, "Update check failed");
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
	configureUpdater();
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
		applyUpdateError(error, "Download failed");
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
	await requestQuitAndInstall();
}
