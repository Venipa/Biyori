import { eq } from "drizzle-orm";
import { ANIME_STALE_MS, isAnimeStale } from "../lib/anime-stale";
import { clearActivity, completeActivity, upsertActivity } from "./activity";
import { readAnilistAuth } from "./anilist/store";
import { syncAniListList, syncAniListLive } from "./anilist/sync";
import type { DatabaseClient } from "./db";
import { appSetting } from "./db/schema";
import { shouldBumpListRevision } from "./list-revision";
import { setAppNotice } from "./notice";

export type SyncPhase = "idle" | "running" | "error";

export type SyncSnapshot = {
	phase: SyncPhase;
	message: string;
	processed: number | null;
	total: number | null;
	lastSuccessAt: number | null;
	listRevision: number;
};

type SyncListener = (snapshot: SyncSnapshot) => void;

const SERVICE_NAME = "AniList";
const LIST_SYNCED_AT_KEY = "anilist.listSyncedAt";

type ListSyncStamp = {
	at: string;
	count: number;
};

function listSyncedAtKey(userId: number): string {
	return `${LIST_SYNCED_AT_KEY}.${userId}`;
}

function readListSyncStamp(database: DatabaseClient, userId: number): ListSyncStamp | null {
	const row = database
		.select({ value: appSetting.value })
		.from(appSetting)
		.where(eq(appSetting.key, listSyncedAtKey(userId)))
		.get();
	if (!row?.value) {
		return null;
	}
	try {
		const parsed: unknown = JSON.parse(row.value);
		if (parsed && typeof parsed === "object" && "at" in parsed && typeof parsed.at === "string") {
			const count = "count" in parsed && typeof parsed.count === "number" ? parsed.count : 0;
			return { at: parsed.at, count };
		}
	} catch {
		return { at: row.value, count: 0 };
	}
	return { at: row.value, count: 0 };
}

function writeListSyncStamp(database: DatabaseClient, userId: number, stamp: ListSyncStamp): void {
	const value = JSON.stringify(stamp);
	database
		.insert(appSetting)
		.values({ key: listSyncedAtKey(userId), value })
		.onConflictDoUpdate({
			target: appSetting.key,
			set: { value },
		})
		.run();
}

const IDLE: SyncSnapshot = {
	phase: "idle",
	message: "",
	processed: null,
	total: null,
	lastSuccessAt: null,
	listRevision: 0,
};

let db: DatabaseClient | null = null;
let snapshot: SyncSnapshot = IDLE;
let running = false;
let rerunAfter = false;
let abortController: AbortController | null = null;
let liveTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<SyncListener>();
const LIVE_SYNC_MS = ANIME_STALE_MS;

function synchronizingMessage(processed?: number): string {
	if (processed == null || processed <= 0) {
		return `Synchronizing with ${SERVICE_NAME}...`;
	}
	return `Synchronizing with ${SERVICE_NAME}... (${processed})`;
}

function taggedMessage(message: string): string {
	return `[${SERVICE_NAME}] ${message}`;
}

function emit(next: SyncSnapshot): void {
	snapshot = next;
	for (const listener of listeners) {
		listener(snapshot);
	}
}

function emitRunning(message: string, processed: number | null, total: number | null, bumpList = false): void {
	emit({
		phase: "running",
		message,
		processed,
		total,
		lastSuccessAt: snapshot.lastSuccessAt,
		listRevision: bumpList ? snapshot.listRevision + 1 : snapshot.listRevision,
	});
	upsertActivity({
		source: "anilist-sync",
		title: "AniList",
		body: processed != null && processed > 0 ? `Synchronizing (${processed})` : "Synchronizing",
	});
	setAppNotice(message, { toast: false, busy: true });
}

export function getSyncSnapshot(): SyncSnapshot {
	return snapshot;
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function initAniListSync(database: DatabaseClient): void {
	db = database;
	if (liveTimer) {
		clearInterval(liveTimer);
	}
	liveTimer = setInterval(() => {
		void requestAniListLiveSync();
	}, LIVE_SYNC_MS);
	void startAniListSyncIfAuthed();
}

export function abortAniListSync(): void {
	rerunAfter = false;
	abortController?.abort();
	abortController = null;
	emit({
		...IDLE,
		lastSuccessAt: snapshot.lastSuccessAt,
		listRevision: snapshot.listRevision,
	});
	clearActivity("anilist-sync");
}

export function requestAniListSync(): { accepted: true } {
	if (running) {
		rerunAfter = true;
		return { accepted: true };
	}
	void runSync();
	return { accepted: true };
}

export async function startAniListSyncIfAuthed(): Promise<void> {
	if (!db) {
		return;
	}
	const auth = readAnilistAuth();
	if (!auth || auth.expiresAt <= Date.now()) {
		return;
	}
	const stamp = readListSyncStamp(db, auth.userId);
	if (stamp && !isAnimeStale(stamp.at)) {
		const at = Date.parse(stamp.at);
		emit({
			...IDLE,
			lastSuccessAt: Number.isFinite(at) ? at : Date.now(),
			message: taggedMessage(`${stamp.count} titles`),
			processed: stamp.count,
			total: stamp.count,
			listRevision: snapshot.listRevision,
		});
		return;
	}
	requestAniListSync();
}

function requestAniListLiveSync(): void {
	if (running || !db) {
		return;
	}
	const auth = readAnilistAuth();
	if (!auth || auth.expiresAt <= Date.now()) {
		return;
	}
	void runLiveSync(auth.accessToken);
}

async function runLiveSync(token: string): Promise<void> {
	if (!db || running) {
		return;
	}
	running = true;
	const controller = new AbortController();
	abortController = controller;
	const { signal } = controller;
	try {
		const wrote = await syncAniListLive(db, { token, signal });
		if (signal.aborted || wrote <= 0) {
			return;
		}
		emit({
			...snapshot,
			listRevision: snapshot.listRevision + 1,
		});
	} catch {
		if (signal.aborted) {
			return;
		}
	} finally {
		running = false;
		if (abortController === controller) {
			abortController = null;
		}
	}
}

async function runSync(): Promise<void> {
	if (!db) {
		return;
	}
	running = true;
	rerunAfter = false;
	const controller = new AbortController();
	abortController = controller;
	const { signal } = controller;

	try {
		const auth = readAnilistAuth();
		if (!auth || auth.expiresAt <= Date.now()) {
			const title = taggedMessage("Not connected");
			emit({
				...IDLE,
				lastSuccessAt: snapshot.lastSuccessAt,
				listRevision: snapshot.listRevision,
				phase: "error",
				message: title,
			});
			completeActivity({ source: "anilist-sync", title: "AniList", body: "Not connected", status: "error" });
			setAppNotice(title);
			return;
		}

		emitRunning(synchronizingMessage(), null, null);

		let lastListBumpAt = 0;
		const synced = await syncAniListList(db, {
			token: auth.accessToken,
			userId: auth.userId,
			signal,
			onProgress: (processed, wrote) => {
				const now = Date.now();
				const bumpList = wrote > 0 && shouldBumpListRevision(lastListBumpAt, now);
				if (bumpList) {
					lastListBumpAt = now;
				}
				emitRunning(synchronizingMessage(processed), processed, null, bumpList);
			},
		});

		if (signal.aborted) {
			return;
		}

		writeListSyncStamp(db, auth.userId, { at: new Date().toISOString(), count: synced });
		emit({
			phase: "idle",
			message: taggedMessage(`${synced} titles`),
			processed: synced,
			total: synced,
			lastSuccessAt: Date.now(),
			listRevision: snapshot.listRevision + 1,
		});
		setAppNotice(taggedMessage(`${synced} titles`));
		completeActivity({
			source: "anilist-sync",
			title: "AniList",
			body: `Finished · ${synced} titles`,
			status: "ok",
		});
	} catch (error) {
		if (signal.aborted) {
			return;
		}
		const message = error instanceof Error ? error.message : "Request failed";
		const title = taggedMessage(message);
		emit({
			phase: "error",
			message: title,
			processed: snapshot.processed,
			total: snapshot.total,
			lastSuccessAt: snapshot.lastSuccessAt,
			listRevision: snapshot.listRevision,
		});
		completeActivity({ source: "anilist-sync", title: "AniList", body: message, status: "error" });
		setAppNotice(title);
	} finally {
		running = false;
		if (abortController === controller) {
			abortController = null;
		}
		if (rerunAfter && !signal.aborted) {
			rerunAfter = false;
			void runSync();
		}
	}
}
