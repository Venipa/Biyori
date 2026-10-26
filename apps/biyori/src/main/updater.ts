import { log } from "@biyori/logger";
import { t } from "@biyori/translations/i18n";
import { is } from "@electron-toolkit/utils";
import { observable } from "@trpc/server/observable";
import { app } from "electron";
import { autoUpdater } from "electron-updater";
import { getVersionChannel, type ProgressInfo, parseUpdateChannel, type ReleaseNoteEntry, type UpdateChannel } from "../shared/updater";
import { parseGithubChangelog, pickUpdateRelease, sanitizeUpdateError } from "./github-releases";
import { requestQuitAndInstall } from "./handlers/quit-handler";
import { trackedFetch } from "./http-stats";
import { loadAppSettings, subscribeSettings } from "./settings";

export const UPDATE_GITHUB_REPO = "Venipa/biyori";

export type ChangelogResult = { ok: true; items: ReleaseNoteEntry[] } | { ok: false; error: string };

export type AppUpdatePhase = "idle" | "checking" | "up-to-date" | "available" | "downloading" | "ready" | "error" | "dev";

export type AppUpdateState = {
	phase: AppUpdatePhase;
	localVersion: string;
	localChannel: string;
	buildChannel: string;
	localHash: string;
	remoteVersion: string | null;
	remoteHash: string | null;
	updateAvailable: boolean;
	updateReady: boolean;
	progress: ProgressInfo | null;
	message: string;
	error: string | null;
};

type Listener = (state: AppUpdateState) => void;

const listeners = new Set<Listener>();

let state: AppUpdateState = {
	phase: "idle",
	localVersion: "",
	localChannel: "",
	buildChannel: "",
	localHash: "",
	remoteVersion: null,
	remoteHash: null,
	updateAvailable: false,
	updateReady: false,
	progress: null,
	message: "",
	error: null,
};

let checking = false;
let downloading = false;
let statusHooked = false;
let lastUserChannel: UpdateChannel | null = null;
let channelWatchBound = false;

function emit(next: AppUpdateState): void {
	state = next;
	for (const listener of listeners) {
		listener(state);
	}
}

function patch(partial: Partial<AppUpdateState>): void {
	emit({ ...state, ...partial });
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

function bakedChannel(): UpdateChannel {
	return parseUpdateChannel(import.meta.env.VITE_APP_UPDATE_CHANNEL ?? getVersionChannel(app.getVersion()));
}

async function resolveUserChannel(): Promise<UpdateChannel> {
	try {
		return parseUpdateChannel(loadAppSettings().updateChannel);
	} catch {
		return bakedChannel();
	}
}

// Channel selection happens on our side; electron-updater only reads the picked release's latest*.yml
// (electron-builder's github publisher writes latest*.yml for every release, prerelease or not).
function applyUpdaterFeed(tag: string): void {
	const { owner, repo } = githubRepo();
	autoUpdater.setFeedURL({ provider: "generic", url: `https://github.com/${owner}/${repo}/releases/download/${tag}` });
	autoUpdater.autoDownload = false;
	autoUpdater.allowDowngrade = false;
	// a downloaded update installs on the next real quit unless the user restarts now
	autoUpdater.autoInstallOnAppQuit = true;
}

async function fetchReleases(): Promise<unknown> {
	const { owner, repo } = githubRepo();
	const response = await trackedFetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=30`, {
		headers: {
			Accept: "application/vnd.github+json",
			"User-Agent": "biyori",
		},
	});
	if (!response.ok) {
		throw new Error(`GitHub releases request failed: ${response.status}`);
	}
	return response.json();
}

function bindChannelWatch(): void {
	if (channelWatchBound) {
		return;
	}
	channelWatchBound = true;
	subscribeSettings((settings) => {
		const next = parseUpdateChannel(settings.updateChannel);
		if (next === lastUserChannel) {
			return;
		}
		lastUserChannel = next;
		void checkForAppUpdate();
	});
}

function applyUpdateError(error: unknown, fallback: string): void {
	log.error("updater", error);
	const message = sanitizeUpdateError(error, fallback);
	patch({
		phase: "error",
		error: message,
		message,
		progress: null,
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
		patch({ phase: "checking", message: t("main.update.checking"), error: null });
	});
	autoUpdater.on("update-available", (info) => {
		patch({
			phase: "available",
			updateAvailable: true,
			remoteVersion: info.version,
			progress: null,
			message: t("main.update.available", { version: info.version }),
			error: null,
		});
	});
	autoUpdater.on("update-not-available", (info) => {
		patch({
			phase: "up-to-date",
			updateAvailable: false,
			remoteVersion: info.version,
			progress: null,
			message: t("main.update.upToDate"),
			error: null,
		});
	});
	autoUpdater.on("download-progress", (info) => {
		patch({
			phase: "downloading",
			progress: {
				total: info.total,
				delta: info.delta,
				transferred: info.transferred,
				percent: info.percent,
				bytesPerSecond: info.bytesPerSecond,
			},
			message: t("main.update.downloading"),
			error: null,
		});
	});
	autoUpdater.on("update-downloaded", (info) => {
		patch({
			phase: "ready",
			updateAvailable: true,
			updateReady: true,
			progress: null,
			remoteVersion: info.version,
			message: t("main.update.downloaded"),
			error: null,
		});
	});
	autoUpdater.on("error", (error) => {
		applyUpdateError(error, t("main.update.checkFailed"));
	});
}

export async function refreshLocalUpdateInfo(): Promise<AppUpdateState> {
	bindChannelWatch();
	const channel = await resolveUserChannel();
	lastUserChannel = channel;
	patch({
		localVersion: app.getVersion(),
		localChannel: channel,
		buildChannel: getVersionChannel(app.getVersion()) ?? bakedChannel(),
		localHash: import.meta.env.VITE_APP_GIT_HASH ?? "",
	});
	return state;
}

export async function loadChangelog(): Promise<ChangelogResult> {
	bindChannelWatch();
	const channel = await resolveUserChannel();
	try {
		return parseGithubChangelog(await fetchReleases(), channel);
	} catch {
		return { ok: false, error: t("main.update.changelogFailed") };
	}
}

export async function checkForAppUpdate(): Promise<AppUpdateState> {
	if (checking) {
		return state;
	}
	checking = true;
	hookStatus();
	bindChannelWatch();
	try {
		await refreshLocalUpdateInfo();
		const channel = lastUserChannel ?? (await resolveUserChannel());
		if (is.dev) {
			patch({
				phase: "dev",
				updateAvailable: false,
				updateReady: false,
				progress: null,
				remoteVersion: null,
				remoteHash: null,
				message: t("main.update.devSkip"),
				error: null,
			});
			return state;
		}
		patch({ phase: "checking", message: t("main.update.checking"), progress: null, error: null });
		const release = pickUpdateRelease(await fetchReleases(), channel, app.getVersion());
		if (!release) {
			patch({
				phase: "up-to-date",
				updateAvailable: false,
				updateReady: false,
				remoteVersion: null,
				progress: null,
				message: t("main.update.upToDate"),
				error: null,
			});
			return state;
		}
		applyUpdaterFeed(release.tag_name);
		await autoUpdater.checkForUpdates();
		return state;
	} catch (error) {
		applyUpdateError(error, t("main.update.checkFailed"));
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
				message: t("main.update.devSkip"),
			});
			return state;
		}
		patch({
			phase: "downloading",
			progress: null,
			message: t("main.update.downloading"),
			error: null,
		});
		await autoUpdater.downloadUpdate();
		return state;
	} catch (error) {
		applyUpdateError(error, t("main.update.downloadFailed"));
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
		message: t("main.update.restarting"),
	});
	await requestQuitAndInstall();
}
