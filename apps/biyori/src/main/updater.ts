import { log } from "@biyori/logger";
import { is } from "@electron-toolkit/utils";
import { observable } from "@trpc/server/observable";
import { app } from "electron";
import { autoUpdater, type UpdateInfo as ElectronUpdateInfo } from "electron-updater";
import semver from "semver";
import {
	channelWantsPrerelease,
	cleanSemver,
	electronUpdaterChannelFor,
	getVersionChannel,
	isVersionAllowedOnChannel,
	type ProgressInfo,
	parseUpdateChannel,
	type ReleaseNoteEntry,
	type UpdateChannel,
} from "../shared/updater";
import { parseGithubChangelog, sanitizeUpdateError } from "./github-releases";
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
let ignoreUpdaterEvents = false;
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

function applyUpdaterFeed(channel: UpdateChannel): void {
	const { owner, repo } = githubRepo();
	autoUpdater.setFeedURL({ provider: "github", owner, repo });
	autoUpdater.autoDownload = false;
	autoUpdater.allowPrerelease = channelWantsPrerelease(channel);
	autoUpdater.channel = electronUpdaterChannelFor(channel);
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
	if (ignoreUpdaterEvents) {
		return;
	}
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
		if (ignoreUpdaterEvents) {
			return;
		}
		patch({ phase: "checking", message: "Checking for updates...", error: null });
	});
	autoUpdater.on("update-available", (info) => {
		if (ignoreUpdaterEvents) {
			return;
		}
		patch({
			phase: "available",
			updateAvailable: true,
			remoteVersion: info.version,
			progress: null,
			message: `Update available: ${info.version}`,
			error: null,
		});
	});
	autoUpdater.on("update-not-available", (info) => {
		if (ignoreUpdaterEvents) {
			return;
		}
		patch({
			phase: "up-to-date",
			updateAvailable: false,
			remoteVersion: info.version,
			progress: null,
			message: "You are up to date",
			error: null,
		});
	});
	autoUpdater.on("download-progress", (info) => {
		if (ignoreUpdaterEvents) {
			return;
		}
		patch({
			phase: "downloading",
			progress: {
				total: info.total,
				delta: info.delta,
				transferred: info.transferred,
				percent: info.percent,
				bytesPerSecond: info.bytesPerSecond,
			},
			message: "Downloading update...",
			error: null,
		});
	});
	autoUpdater.on("update-downloaded", (info) => {
		if (ignoreUpdaterEvents) {
			return;
		}
		patch({
			phase: "ready",
			updateAvailable: true,
			updateReady: true,
			progress: null,
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
	const { owner, repo } = githubRepo();
	const channel = await resolveUserChannel();
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

function isUpdateInRange(ver: string, channel: UpdateChannel): boolean {
	if (!isVersionAllowedOnChannel(ver, channel)) {
		return false;
	}
	try {
		return semver.gtr(ver, app.getVersion(), {
			includePrerelease: channel !== "stable",
			loose: true,
		});
	} catch {
		return false;
	}
}

async function probeFeed(feed: UpdateChannel, allowedOn: UpdateChannel): Promise<ElectronUpdateInfo | null> {
	applyUpdaterFeed(feed);
	try {
		const result = await autoUpdater.checkForUpdates();
		const info = result?.updateInfo;
		if (!info) {
			return null;
		}
		if (!isUpdateInRange(info.version, allowedOn)) {
			return null;
		}
		return info;
	} catch (error) {
		log.error("updater probe failed", feed, error);
		return null;
	}
}

async function resolveBestUpdate(channel: UpdateChannel): Promise<ElectronUpdateInfo | null> {
	ignoreUpdaterEvents = true;
	try {
		const candidates: ElectronUpdateInfo[] = [];
		const selected = await probeFeed(channel, channel);
		if (selected) {
			candidates.push(selected);
		}
		if (channel !== "stable") {
			const stable = await probeFeed("stable", channel);
			if (stable) {
				candidates.push(stable);
			}
		}
		applyUpdaterFeed(channel);
		if (!candidates.length) {
			return null;
		}
		candidates.sort((a, b) => {
			const left = cleanSemver(a.version) ?? a.version;
			const right = cleanSemver(b.version) ?? b.version;
			return semver.rcompare(left, right, { loose: true });
		});
		return candidates[0] ?? null;
	} finally {
		ignoreUpdaterEvents = false;
		applyUpdaterFeed(channel);
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
		applyUpdaterFeed(channel);
		if (is.dev) {
			patch({
				phase: "dev",
				updateAvailable: false,
				updateReady: false,
				progress: null,
				remoteVersion: null,
				remoteHash: null,
				message: "Dev builds skip updates",
				error: null,
			});
			return state;
		}
		patch({ phase: "checking", message: "Checking for updates...", progress: null, error: null });
		const best = await resolveBestUpdate(channel);
		if (!best) {
			patch({
				phase: "up-to-date",
				updateAvailable: false,
				updateReady: false,
				remoteVersion: null,
				progress: null,
				message: "You are up to date",
				error: null,
			});
			return state;
		}
		patch({
			phase: "available",
			updateAvailable: true,
			updateReady: false,
			remoteVersion: best.version,
			progress: null,
			message: `Update available: ${best.version}`,
			error: null,
		});
		if (!state.updateReady) {
			await downloadAppUpdate();
		}
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
	try {
		if (is.dev) {
			patch({
				phase: "dev",
				message: "Dev builds skip updates",
			});
			return state;
		}
		applyUpdaterFeed(lastUserChannel ?? (await resolveUserChannel()));
		patch({
			phase: "downloading",
			progress: null,
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
