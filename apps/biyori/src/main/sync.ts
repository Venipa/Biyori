import { t } from "@biyori/translations/i18n";
import { eq } from "drizzle-orm";
import { ANIME_STALE_MS, isAnimeStale } from "../lib/anime-stale";
import { clearActivity, completeActivity, upsertActivity } from "./activity";
import { getAnilistTransferBytes, resetAnilistTransferBytes } from "./anilist/client";
import type { DatabaseClient } from "./db";
import { appSetting } from "./db/schema";
import { formatElapsedSeconds } from "./format-duration";
import { shouldBumpListRevision } from "./list-revision";
import { setAppNotice } from "./notice";
import { activeProvider, type ListProvider } from "./providers";
import { credentialsStore } from "./stores";

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

const LIST_SYNCED_AT_KEY = "anilist.listSyncedAt";

type ListSyncStamp = {
	at: string;
	count: number;
	seconds?: string;
	size?: string;
};

/** AniList keeps its bare-id key from before multi-service support. */
function listSyncedAtKey(userId: number | string): string {
	return `${LIST_SYNCED_AT_KEY}.${userId}`;
}

function readListSyncStamp(database: DatabaseClient, userId: number | string): ListSyncStamp | null {
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
			const seconds = "seconds" in parsed && typeof parsed.seconds === "string" ? parsed.seconds : undefined;
			const size = "size" in parsed && typeof parsed.size === "string" ? parsed.size : undefined;
			return { at: parsed.at, count, seconds, size };
		}
	} catch {
		return { at: row.value, count: 0 };
	}
	return { at: row.value, count: 0 };
}

function writeListSyncStamp(database: DatabaseClient, userId: number | string, stamp: ListSyncStamp): void {
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
let syncStartedAt = 0;
let liveTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<SyncListener>();
const LIVE_SYNC_MS = ANIME_STALE_MS;

function synchronizingMessage(processed?: number): string {
	if (processed == null || processed <= 0) {
		return t("main.sync.synchronizingBody");
	}
	return t("main.sync.synchronizingBodyCount", { processed });
}

function taggedStatus(message: string): string {
	return t("main.sync.tagged", { message });
}

function stampStatus(stamp: ListSyncStamp): string {
	if (stamp.seconds && stamp.size) {
		return taggedStatus(t("main.sync.finished", { count: stamp.count, seconds: stamp.seconds, size: stamp.size }));
	}
	return taggedStatus(t("main.sync.titles", { count: stamp.count }));
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
		message: taggedStatus(message),
		processed,
		total,
		lastSuccessAt: snapshot.lastSuccessAt,
		listRevision: bumpList ? snapshot.listRevision + 1 : snapshot.listRevision,
	});
	upsertActivity({
		source: "anilist-sync",
		title: t("shell.anilist"),
		body: message,
	});
	setAppNotice(taggedStatus(message), { toast: false, busy: true });
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
	const stampId = activeStampId();
	if (stampId == null) {
		return;
	}
	const stamp = readListSyncStamp(db, stampId);
	if (stamp && !isAnimeStale(stamp.at)) {
		const at = Date.parse(stamp.at);
		emit({
			...IDLE,
			lastSuccessAt: Number.isFinite(at) ? at : Date.now(),
			message: stampStatus(stamp),
			processed: stamp.count,
			total: stamp.count,
			listRevision: snapshot.listRevision,
		});
		return;
	}
	requestAniListSync();
}

/** Sync stamps live in the service's own DB, so the account id is enough. */
function activeStampId(): number | null {
	return activeProvider().isConnected() ? (credentialsStore.get("activeAccount")?.id ?? null) : null;
}

function requestAniListLiveSync(): void {
	const provider = activeProvider();
	if (running || !db || !provider.refreshAiring || !provider.isConnected()) {
		return;
	}
	void runLiveSync(provider.refreshAiring);
}

async function runLiveSync(refreshAiring: NonNullable<ListProvider["refreshAiring"]>): Promise<void> {
	if (!db || running) {
		return;
	}
	running = true;
	const controller = new AbortController();
	abortController = controller;
	const { signal } = controller;
	try {
		const wrote = await refreshAiring(db, signal);
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

function formatTransferSize(bytes: number): string {
	const units = ["B", "KiB", "MiB", "GiB", "TiB"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const digits = unit === 0 ? 0 : value >= 10 ? 1 : 2;
	return `${value.toFixed(digits)} ${units[unit]}`;
}

function syncStats(): { seconds: string; size: string } {
	return {
		seconds: formatElapsedSeconds(Date.now() - syncStartedAt),
		size: formatTransferSize(getAnilistTransferBytes()),
	};
}

async function runSync(): Promise<void> {
	if (!db) {
		return;
	}
	running = true;
	rerunAfter = false;
	syncStartedAt = Date.now();
	resetAnilistTransferBytes();
	const controller = new AbortController();
	abortController = controller;
	const { signal } = controller;

	try {
		const provider = activeProvider();
		const stampId = activeStampId();
		if (stampId == null) {
			const title = t("main.sync.notConnected");
			emit({
				...IDLE,
				lastSuccessAt: snapshot.lastSuccessAt,
				listRevision: snapshot.listRevision,
				phase: "error",
				message: taggedStatus(title),
			});
			completeActivity({ source: "anilist-sync", title: t("shell.anilist"), body: title, status: "error" });
			setAppNotice(taggedStatus(title));
			return;
		}

		emitRunning(synchronizingMessage(), null, null);

		let lastListBumpAt = 0;
		const onProgress = (processed: number, wrote: number) => {
			const now = Date.now();
			const bumpList = wrote > 0 && shouldBumpListRevision(lastListBumpAt, now);
			if (bumpList) {
				lastListBumpAt = now;
			}
			emitRunning(synchronizingMessage(processed), processed, null, bumpList);
		};

		await provider.refreshProfile(signal);
		const synced = await provider.importList(db, { signal, onProgress });

		if (signal.aborted) {
			return;
		}

		const stats = syncStats();
		writeListSyncStamp(db, stampId, { at: new Date().toISOString(), count: synced, ...stats });
		const done = t("main.sync.finished", { count: synced, ...stats });
		emit({
			phase: "idle",
			message: taggedStatus(done),
			processed: synced,
			total: synced,
			lastSuccessAt: Date.now(),
			listRevision: snapshot.listRevision + 1,
		});
		setAppNotice(taggedStatus(done));
		completeActivity({
			source: "anilist-sync",
			title: t("shell.anilist"),
			body: done,
			status: "ok",
		});
	} catch (error) {
		if (signal.aborted) {
			return;
		}
		const message = error instanceof Error ? error.message : t("main.sync.requestFailed");
		const title = t("main.sync.failedWithStats", { message, ...syncStats() });
		emit({
			phase: "error",
			message: taggedStatus(title),
			processed: snapshot.processed,
			total: snapshot.total,
			lastSuccessAt: snapshot.lastSuccessAt,
			listRevision: snapshot.listRevision,
		});
		completeActivity({
			source: "anilist-sync",
			title: t("shell.anilist"),
			body: title,
			status: "error",
		});
		setAppNotice(taggedStatus(title));
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
