import { completeActivity, clearActivity, upsertActivity } from "./activity";
import { readAnilistAuth, writeAnilistAuth } from "./anilist/store";
import { fetchViewer, syncAniListList } from "./anilist/sync";
import type { DatabaseClient } from "./db";

export type SyncPhase = "idle" | "running" | "error";

export type SyncSnapshot = {
	phase: SyncPhase;
	message: string;
	processed: number | null;
	total: number | null;
	lastSuccessAt: number | null;
};

type SyncListener = (snapshot: SyncSnapshot) => void;

const SERVICE_NAME = "AniList";

const IDLE: SyncSnapshot = {
	phase: "idle",
	message: "",
	processed: null,
	total: null,
	lastSuccessAt: null,
};

let db: DatabaseClient | null = null;
let snapshot: SyncSnapshot = IDLE;
let running = false;
let rerunAfter = false;
let abortController: AbortController | null = null;
const listeners = new Set<SyncListener>();

function synchronizingMessage(percent?: number): string {
	if (percent == null) {
		return `Synchronizing with ${SERVICE_NAME}...`;
	}
	return `Synchronizing with ${SERVICE_NAME}... (${percent}%)`;
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

function emitRunning(message: string, processed: number | null, total: number | null): void {
	emit({
		phase: "running",
		message,
		processed,
		total,
		lastSuccessAt: snapshot.lastSuccessAt,
	});
	upsertActivity({
		source: "anilist-sync",
		title: "AniList",
		body: processed != null && total != null && total > 0 ? `Synchronizing (${Math.round((processed / total) * 100)}%)` : "Synchronizing",
	});
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
}

export function abortAniListSync(): void {
	rerunAfter = false;
	abortController?.abort();
	abortController = null;
	emit({
		...IDLE,
		lastSuccessAt: snapshot.lastSuccessAt,
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
	requestAniListSync();
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
				phase: "error",
				message: title,
			});
			completeActivity({ source: "anilist-sync", title: "AniList", body: "Not connected", status: "error" });
			return;
		}

		emitRunning(synchronizingMessage(), null, null);

		const viewer = await fetchViewer(auth.accessToken, signal);
		if (signal.aborted) {
			return;
		}
		writeAnilistAuth({
			...auth,
			userId: viewer.id,
			username: viewer.name,
		});

		const covers = await syncAniListList(db, {
			token: auth.accessToken,
			userId: viewer.id,
			signal,
			onProgress: (processed, total) => {
				const percent = total > 0 ? Math.round((processed / total) * 100) : undefined;
				emitRunning(synchronizingMessage(percent), processed, total);
			},
		});

		if (signal.aborted) {
			return;
		}

		emit({
			phase: "idle",
			message: "",
			processed: covers.length,
			total: covers.length,
			lastSuccessAt: Date.now(),
		});
		completeActivity({
			source: "anilist-sync",
			title: "AniList",
			body: `Finished · ${covers.length} titles`,
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
		});
		completeActivity({ source: "anilist-sync", title: "AniList", body: message, status: "error" });
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
