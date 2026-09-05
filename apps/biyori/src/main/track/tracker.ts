import { normalizeTitle } from "@biyori/recognition";
import { observable } from "@trpc/server/observable";
import { eq } from "drizzle-orm";
import { joinTitleList, splitTitleList } from "../../lib/split-title-list";
import { isPathInsideFolder } from "../../lib/folder-path";
import type { AppSettings, DefaultService } from "../../lib/schemas/app-settings";
import { readAnilistAuth } from "../anilist/store";
import { anime } from "../db/schema";
import type { DatabaseClient } from "../db";
import { pushNotice } from "../activity";
import { setAppNotice } from "../notice";
import { loadAppSettings, subscribeSettings } from "../settings";
import { syncDiscordPresence } from "../share/discord";
import { setNowPlayingForHttp } from "../share/http";
import { rememberPlaybackApplied, wasPlaybackApplied } from "./applied-playback";
import { getNowPlayingMedia } from "./detect";
import { invalidateCandidateCache, loadCandidates, matchById, matchParsed, namesFrom, similarParsed } from "./match";
import { parsePlayback } from "./parse";
import { enqueueUpdate, initQueueFlush } from "./queue";
import { redirectEpisode, refreshRelations } from "./relations";
import { canApplyProgress, progressPayload } from "./tracker-progress";
import type { MatchedAnime, NowPlayingMedia, NowPlayingSnapshot, NowPlayingUser, PendingConfirm } from "./types";

type Listener = (snapshot: NowPlayingSnapshot) => void;

const IDLE: NowPlayingSnapshot = {
	media: null,
	parsed: null,
	match: null,
	unrecognized: false,
	similar: [],
	delayRemainingSeconds: 0,
	pendingConfirm: null,
	startedAt: null,
	progressRevision: 0,
	user: { name: "", provider: "anilist" },
};

function idleSnapshot(user: NowPlayingUser): NowPlayingSnapshot {
	return { ...IDLE, progressRevision, user };
}

async function resolveNowPlayingUser(settings: AppSettings): Promise<NowPlayingUser> {
	const provider: DefaultService = settings.defaultService;
	if (provider === "anilist") {
		const auth = readAnilistAuth();
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
let lastMediaIdentity = "";
let forceRematch = false;
let appliedFingerprint = "";
let progressRevision = 0;
let pending: PendingConfirm | null = null;
let pendingExit: PendingConfirm | null = null;
let boundMatch: { fingerprint: string; animeId: number } | null = null;
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

function mediaIdentity(media: NowPlayingMedia): string {
	return `${media.player}|${media.filePath ?? media.title}|${media.windowId}`;
}

function isInsideLibrary(filePath: string | null, folders: Array<{ path: string }>): boolean {
	if (!filePath) {
		return true;
	}
	return folders.some((folder) => isPathInsideFolder(filePath, folder.path));
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

export function nowPlayingObservable(): ReturnType<typeof observable<NowPlayingSnapshot>> {
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
	const settings = loadAppSettings();
	if (!canApplyProgress(match, episode, settings)) {
		return;
	}
	await enqueueUpdate(db, {
		animeId: match.id,
		title: match.title,
		episode,
		payload: progressPayload(match, episode),
	});
	if (lastFingerprint) {
		appliedFingerprint = lastFingerprint;
		rememberPlaybackApplied(lastFingerprint);
	}
	progressRevision += 1;
}

export async function noteManualListUpdate(animeId: number): Promise<void> {
	if (lastFingerprint && snapshot.match?.id === animeId) {
		appliedFingerprint = lastFingerprint;
		rememberPlaybackApplied(lastFingerprint);
	}
	if (!db || snapshot.match?.id !== animeId) {
		return;
	}
	const candidates = await loadCandidates(db);
	const match = matchById(animeId, candidates);
	if (!match) {
		return;
	}
	progressRevision += 1;
	emit({ ...snapshot, match, progressRevision });
}

async function tick(): Promise<void> {
	if (!db || tickInFlight) {
		return;
	}
	tickInFlight = true;
	try {
		await runTick();
	} catch {
		/* hana/native failures must not stop the poll loop */
	} finally {
		tickInFlight = false;
	}
}

async function runTick(): Promise<void> {
	if (!db) {
		return;
	}
	const settings = loadAppSettings();
	const user = await resolveNowPlayingUser(settings);
	if (!settings.enableRecognition) {
		delayElapsedSeconds = 0;
		delayLastTickAt = 0;
		sessionStartedAt = 0;
		lastFingerprint = "";
		lastMediaIdentity = "";
		pending = null;
		pendingExit = null;
		boundMatch = null;
		if (snapshot.media || snapshot.parsed || snapshot.match) {
			emit(idleSnapshot(user));
			syncDiscordPresence(null, settings);
		}
		return;
	}

	const media = await getNowPlayingMedia(settings, snapshot.media?.windowId);
	if (!media) {
		lastMediaIdentity = "";
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
		boundMatch = null;
		if (snapshot.media || snapshot.parsed || snapshot.match) {
			emit(idleSnapshot(user));
			syncDiscordPresence(null, settings);
		}
		return;
	}

	if (settings.ignoreOutsideLibrary && media.filePath && !isInsideLibrary(media.filePath, settings.libraryFolders)) {
		emit({
			media,
			parsed: null,
			match: null,
			unrecognized: true,
			similar: [],
			delayRemainingSeconds: 0,
			pendingConfirm: pending,
			startedAt: snapshot.startedAt,
			progressRevision,
			user,
		});
		syncDiscordPresence(null, settings);
		return;
	}

	const identity = mediaIdentity(media);
	const reuse =
		!forceRematch && identity === lastMediaIdentity && snapshot.parsed != null && snapshot.media != null;
	forceRematch = false;
	lastMediaIdentity = identity;

	let parsed = snapshot.parsed;
	let match = snapshot.match;
	let similar = snapshot.similar;
	if (!reuse) {
		parsed = await parsePlayback(media, {
			ignoredStrings: settings.ignoredStrings,
		});
		if (!parsed) {
			emit({
				media,
				parsed: null,
				match: null,
				unrecognized: true,
				similar: [],
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
		match = matchParsed(
			{
				title: parsed.rawTitle,
				season: parsed.season,
				year: parsed.year,
			},
			candidates,
		);
		if (match && parsed.episode != null) {
			const redirected = redirectEpisode(match, parsed.episode);
			parsed.episode = redirected.episode;
			if (redirected.id !== match.id) {
				match = matchById(redirected.id, candidates) ?? match;
			}
		}
		similar = match
			? []
			: similarParsed(
					{
						title: parsed.rawTitle,
						season: parsed.season,
						year: parsed.year,
					},
					candidates,
				);
	}
	if (!parsed) {
		emit({
			media,
			parsed: null,
			match: null,
			unrecognized: true,
			similar: [],
			delayRemainingSeconds: 0,
			pendingConfirm: pending,
			startedAt: snapshot.startedAt,
			progressRevision,
			user,
		});
		syncDiscordPresence(null, settings);
		return;
	}

	const key = fingerprint(media, parsed.episode);
	if (key !== lastFingerprint) {
		lastFingerprint = key;
		boundMatch = null;
		delayElapsedSeconds = 0;
		delayLastTickAt = Date.now();
		sessionStartedAt = delayLastTickAt;
		pending = null;
		pendingExit = null;
		if (wasPlaybackApplied(key)) {
			appliedFingerprint = key;
		}
		if (match && settings.notifyOnRecognized) {
			const title = `Now playing: ${match.title}`;
			setAppNotice(title);
			pushNotice({ source: "playback", title: match.title, body: "Now playing" });
		} else if (!match && settings.notifyOnUnrecognized) {
			const title = `Unrecognized: ${parsed.title}`;
			setAppNotice(title);
			pushNotice({ source: "playback", title: parsed.title, body: "Unrecognized" });
		}
	} else if (wasPlaybackApplied(key)) {
		appliedFingerprint = key;
	}

	if (!match && boundMatch?.fingerprint === key) {
		const candidates = await loadCandidates(db);
		match = matchById(boundMatch.animeId, candidates);
	}

	const now = Date.now();
	const isActive = !settings.playerMustBeInFocus || media.foreground;
	if (isActive && delayLastTickAt > 0) {
		delayElapsedSeconds += Math.max(0, (now - delayLastTickAt) / 1000);
	}
	delayLastTickAt = now;
	const remaining = appliedFingerprint === key ? 0 : Math.max(0, Math.ceil(settings.recognitionDelaySeconds - delayElapsedSeconds));
	const episode = parsed.episode;

	if (match && episode != null && remaining === 0 && appliedFingerprint !== key && !pending) {
		if (!canApplyProgress(match, episode, settings)) {
			appliedFingerprint = key;
			rememberPlaybackApplied(key);
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
		similar: match ? [] : similar,
		delayRemainingSeconds: remaining,
		pendingConfirm: pending,
		startedAt: sessionStartedAt || now,
		progressRevision,
		user,
	};
	if (
		reuse &&
		snapshot.delayRemainingSeconds === remaining &&
		snapshot.media?.foreground === media.foreground &&
		snapshot.pendingConfirm === pending &&
		snapshot.progressRevision === progressRevision
	) {
		return;
	}
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
		pushNotice({
			source: "watch-confirm",
			title: `Update ${pending.title}`,
			body: `Updated to episode ${pending.episode}`,
		});
	}
	pending = null;
	emit({ ...snapshot, pendingConfirm: null });
}

export async function skipPendingUpdate(): Promise<void> {
	appliedFingerprint = lastFingerprint;
	if (lastFingerprint) {
		rememberPlaybackApplied(lastFingerprint);
	}
	pending = null;
	emit({ ...snapshot, pendingConfirm: null });
}

async function rememberUserSynonym(animeId: number, rawTitle: string): Promise<void> {
	if (!db) {
		return;
	}
	const title = rawTitle.trim();
	if (!title) {
		return;
	}
	const rows = await db
		.select({
			title: anime.title,
			alternativeTitles: anime.alternativeTitles,
			userSynonyms: anime.userSynonyms,
		})
		.from(anime)
		.where(eq(anime.id, animeId))
		.limit(1);
	const row = rows[0];
	if (!row) {
		return;
	}
	const existing = namesFrom(row.title, row.alternativeTitles, row.userSynonyms);
	if (existing.includes(normalizeTitle(title))) {
		return;
	}
	invalidateCandidateCache();
	await db
		.update(anime)
		.set({
			userSynonyms: joinTitleList([...splitTitleList(row.userSynonyms), title]),
		})
		.where(eq(anime.id, animeId));
}

export async function chooseNowPlayingMatch(animeId: number): Promise<void> {
	if (!db || !lastFingerprint) {
		return;
	}
	const playingTitle = snapshot.parsed?.rawTitle ?? snapshot.parsed?.title ?? "";
	boundMatch = { fingerprint: lastFingerprint, animeId };
	await rememberUserSynonym(animeId, playingTitle);
	forceRematch = true;
	while (tickInFlight) {
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
	}
	await tick();
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
	const settings = loadAppSettings();
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
