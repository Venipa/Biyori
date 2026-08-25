import { observable } from "@trpc/server/observable";
import type { AppSettings, DefaultService } from "../../lib/schemas/app-settings";
import { readAnilistAuth } from "../anilist/store";
import type { DatabaseClient } from "../db";
import { setAppNotice } from "../notice";
import { loadAppSettings, subscribeSettings } from "../settings";
import { syncDiscordPresence } from "../share/discord";
import { setNowPlayingForHttp } from "../share/http";
import { getNowPlayingMedia } from "./detect";
import { loadCandidates, matchById, matchTitle } from "./match";
import { parsePlayback } from "./parse";
import { enqueueUpdate, initQueueFlush } from "./queue";
import { applyRelation, refreshRelations } from "./relations";
import { canApplyProgress, progressPayload } from "./tracker-progress";
import type {
	MatchedAnime,
	NowPlayingMedia,
	NowPlayingSnapshot,
	NowPlayingUser,
	PendingConfirm,
} from "./types";

type Listener = (snapshot: NowPlayingSnapshot) => void;

const IDLE: NowPlayingSnapshot = {
	media: null,
	parsed: null,
	match: null,
	unrecognized: false,
	delayRemainingSeconds: 0,
	pendingConfirm: null,
	startedAt: null,
	progressRevision: 0,
	user: { name: "", provider: "anilist" },
};

function idleSnapshot(user: NowPlayingUser): NowPlayingSnapshot {
	return { ...IDLE, progressRevision, user };
}

async function resolveNowPlayingUser(
	database: DatabaseClient,
	settings: AppSettings,
): Promise<NowPlayingUser> {
	const provider: DefaultService = settings.defaultService;
	if (provider === "anilist") {
		const auth = await readAnilistAuth(database);
		return { name: auth?.username ?? "", provider };
	}
	return { name: "", provider };
}

let db: DatabaseClient | null = null;
let snapshot: NowPlayingSnapshot = IDLE;
let tickInFlight = false;
const TRACKER_START_DELAY_MS = 2000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let startTimer: ReturnType<typeof setTimeout> | null = null;
let delayElapsedSeconds = 0;
let delayLastTickAt = 0;
let sessionStartedAt = 0;
let lastFingerprint = "";
let appliedFingerprint = "";
let progressRevision = 0;
let pending: PendingConfirm | null = null;
let pendingExit: PendingConfirm | null = null;
const listeners = new Set<Listener>();

function emit(next: NowPlayingSnapshot): void {
	snapshot = next;
	setNowPlayingForHttp(next);
	for (const listener of listeners) {
		listener(snapshot);
	}
}

function fingerprint(media: NowPlayingMedia, episode: number | null): string {
	return `${media.player}|${media.filePath ?? media.title}|${episode ?? "none"}`;
}

function isInsideLibrary(
	filePath: string | null,
	folders: Array<{ path: string }>,
): boolean {
	if (!filePath) {
		return true;
	}
	const lower = filePath.toLowerCase();
	return folders.some((folder) =>
		lower.startsWith(folder.path.toLowerCase()),
	);
}

export function getNowPlayingSnapshot(): NowPlayingSnapshot {
	return snapshot;
}

export function subscribeNowPlaying(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function nowPlayingObservable(): ReturnType<
	typeof observable<NowPlayingSnapshot>
> {
	return observable<NowPlayingSnapshot>((emitNext) => {
		emitNext.next(getNowPlayingSnapshot());
		return subscribeNowPlaying((next) => {
			emitNext.next(next);
		});
	});
}

async function applyProgress(match: MatchedAnime, episode: number): Promise<void> {
	if (!db) {
		return;
	}
	const settings = await loadAppSettings(db);
	if (!canApplyProgress(match, episode, settings)) {
		return;
	}
	await enqueueUpdate(db, {
		animeId: match.id,
		title: match.title,
		episode,
		payload: progressPayload(match, episode),
	});
	progressRevision += 1;
}

async function tick(): Promise<void> {
	if (!db || tickInFlight) {
		return;
	}
	tickInFlight = true;
	try {
		await runTick();
	} finally {
		tickInFlight = false;
	}
}

async function runTick(): Promise<void> {
	if (!db) {
		return;
	}
	const settings = await loadAppSettings(db);
	const user = await resolveNowPlayingUser(db, settings);
	if (!settings.enableRecognition) {
		delayElapsedSeconds = 0;
		delayLastTickAt = 0;
		sessionStartedAt = 0;
		lastFingerprint = "";
		pending = null;
		pendingExit = null;
		emit(idleSnapshot(user));
		syncDiscordPresence(null, settings);
		return;
	}

	const media = await getNowPlayingMedia(settings, snapshot.media?.windowId);
	if (!media) {
		if (pendingExit) {
			const exit = pendingExit;
			pendingExit = null;
			const candidates = await loadCandidates(db);
			const match = matchById(exit.animeId, candidates);
			if (match && canApplyProgress(match, exit.episode, settings)) {
				appliedFingerprint = lastFingerprint;
				await applyProgress(match, exit.episode);
			}
		}
		if (pending) {
			emit({ ...snapshot, media: null, delayRemainingSeconds: 0, user });
			syncDiscordPresence(null, settings);
			return;
		}
		delayElapsedSeconds = 0;
		delayLastTickAt = 0;
		sessionStartedAt = 0;
		lastFingerprint = "";
		emit(idleSnapshot(user));
		syncDiscordPresence(null, settings);
		return;
	}

	if (
		settings.ignoreOutsideLibrary &&
		media.filePath &&
		!isInsideLibrary(media.filePath, settings.libraryFolders)
	) {
		emit({
			media,
			parsed: null,
			match: null,
			unrecognized: true,
			delayRemainingSeconds: 0,
			pendingConfirm: pending,
			startedAt: snapshot.startedAt,
			progressRevision,
			user,
		});
		syncDiscordPresence(null, settings);
		return;
	}

	const parsed = parsePlayback(media, {
		ignoredStrings: settings.ignoredStrings,
	});
	if (!parsed) {
		emit({
			media,
			parsed: null,
			match: null,
			unrecognized: true,
			delayRemainingSeconds: 0,
			pendingConfirm: pending,
			startedAt: snapshot.startedAt,
			progressRevision,
			user,
		});
		syncDiscordPresence(null, settings);
		return;
	}

	const candidates = await loadCandidates(db);
	let match = matchTitle(parsed.title, candidates);
	if (match && parsed.episode != null) {
		const redirected = applyRelation(match.id, parsed.episode);
		parsed.episode = redirected.episode;
		if (redirected.id !== match.id) {
			match = matchById(redirected.id, candidates) ?? match;
		}
	}

	const key = fingerprint(media, parsed.episode);
	if (key !== lastFingerprint) {
		lastFingerprint = key;
		delayElapsedSeconds = 0;
		delayLastTickAt = Date.now();
		sessionStartedAt = delayLastTickAt;
		pending = null;
		pendingExit = null;
		if (match && settings.notifyOnRecognized) {
			setAppNotice(`Now playing: ${match.title}`);
		} else if (!match && settings.notifyOnUnrecognized) {
			setAppNotice(`Unrecognized: ${parsed.title}`);
		}
	}

	const now = Date.now();
	const isActive = !settings.playerMustBeInFocus || media.foreground;
	if (isActive && delayLastTickAt > 0) {
		delayElapsedSeconds += Math.max(0, (now - delayLastTickAt) / 1000);
	}
	delayLastTickAt = now;
	const remaining = Math.max(
		0,
		Math.ceil(settings.recognitionDelaySeconds - delayElapsedSeconds),
	);
	const episode = parsed.episode;

	if (
		match &&
		episode != null &&
		remaining === 0 &&
		appliedFingerprint !== key &&
		!pending
	) {
		if (!canApplyProgress(match, episode, settings)) {
			appliedFingerprint = key;
		} else if (settings.waitUntilPlayerExits) {
			pendingExit = {
				animeId: match.id,
				title: match.title,
				episode,
			};
		} else if (settings.askToConfirmUpdate) {
			pending = {
				animeId: match.id,
				title: match.title,
				episode,
			};
		} else {
			appliedFingerprint = key;
			await applyProgress(match, episode);
		}
	}

	const next: NowPlayingSnapshot = {
		media,
		parsed,
		match,
		unrecognized: !match,
		delayRemainingSeconds: remaining,
		pendingConfirm: pending,
		startedAt: sessionStartedAt || now,
		progressRevision,
		user,
	};
	emit(next);
	syncDiscordPresence(next, settings);
}

export async function confirmPendingUpdate(): Promise<void> {
	if (!db || !pending) {
		return;
	}
	const match = snapshot.match;
	if (match && match.id === pending.animeId) {
		appliedFingerprint = lastFingerprint;
		await applyProgress(match, pending.episode);
	}
	pending = null;
	emit({ ...snapshot, pendingConfirm: null });
}

export async function skipPendingUpdate(): Promise<void> {
	appliedFingerprint = lastFingerprint;
	pending = null;
	emit({ ...snapshot, pendingConfirm: null });
}

export function initTracker(database: DatabaseClient): void {
	db = database;
	void refreshRelations(database);
	initQueueFlush(database);
	void restartTracker();
	subscribeSettings(() => {
		void restartTracker();
	});
}

export async function restartTracker(): Promise<void> {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
	if (flushTimer) {
		clearInterval(flushTimer);
		flushTimer = null;
	}
	if (startTimer) {
		clearTimeout(startTimer);
		startTimer = null;
	}
	if (!db) {
		return;
	}
	const settings = await loadAppSettings(db);
	const interval = Math.max(1, settings.mediaDetectionInterval) * 1000;
	startTimer = setTimeout(() => {
		startTimer = null;
		void tick();
		pollTimer = setInterval(() => {
			void tick();
		}, interval);
		flushTimer = setInterval(() => {
			if (db) {
				void refreshRelations(db);
			}
		}, 60_000);
	}, TRACKER_START_DELAY_MS);
}
