import { observable } from "@trpc/server/observable";
import type { DatabaseClient } from "../db";
import { loadAppSettings, subscribeSettings } from "../settings";
import { getNowPlayingMedia } from "./detect";
import { parsePlayback } from "./parse";
import { loadCandidates, matchById, matchTitle } from "./match";
import { applyRelation, refreshRelations } from "./relations";
import { enqueueUpdate, initQueueFlush } from "./queue";
import { syncDiscordPresence } from "../share/discord";
import { setNowPlayingForHttp } from "../share/http";
import { setAppNotice } from "../notice";
import { readAnilistAuth } from "../anilist/store";
import type { AppSettings, DefaultService } from "../../lib/schemas/app-settings";
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
	user: { name: "", provider: "anilist" },
};

function idleSnapshot(user: NowPlayingUser): NowPlayingSnapshot {
	return { ...IDLE, user };
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
let delayStartedAt = 0;
let lastFingerprint = "";
let appliedFingerprint = "";
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

function canApplyProgress(
	match: MatchedAnime,
	episode: number,
	settings: AppSettings,
): boolean {
	if (episode <= match.episodesWatched) {
		return false;
	}
	if (match.episodes > 0 && episode > match.episodes) {
		return false;
	}
	if (
		settings.ignoreOutOfRangeEpisode &&
		episode > match.episodesWatched + 1
	) {
		return false;
	}
	if (match.status === "Completed" && !match.rewatching) {
		return false;
	}
	return true;
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

export function nowPlayingObservable() {
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
	const finished =
		match.episodes > 0 && episode >= match.episodes && !match.rewatching;
	await enqueueUpdate(db, {
		animeId: match.id,
		title: match.title,
		episode,
		payload: {
			progress: episode,
			status: finished ? "Completed" : "Currently watching",
			dateStarted:
				episode >= 1 && !match.dateStarted ? new Date().toISOString().slice(0, 10) : undefined,
			dateCompleted: finished
				? new Date().toISOString().slice(0, 10)
				: undefined,
		},
	});
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
		delayStartedAt = 0;
		lastFingerprint = "";
		pending = null;
		pendingExit = null;
		emit(idleSnapshot(user));
		syncDiscordPresence(null, settings);
		return;
	}

	const media = await getNowPlayingMedia(settings);
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
		delayStartedAt = 0;
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
		delayStartedAt = Date.now();
		pendingExit = null;
		if (match && settings.notifyOnRecognized) {
			setAppNotice(`Now playing: ${match.title}`);
		} else if (!match && settings.notifyOnUnrecognized) {
			setAppNotice(`Unrecognized: ${parsed.title}`);
		}
	}

	const elapsed = (Date.now() - delayStartedAt) / 1000;
	const remaining = Math.max(
		0,
		Math.ceil(settings.recognitionDelaySeconds - elapsed),
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
		startedAt: delayStartedAt || Date.now(),
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
