import { clearActivity, completeActivity, upsertActivity } from "./activity";
import { readAnilistAuth, writeAnilistAuth } from "./anilist/store";
import { fetchViewer, syncAniListList } from "./anilist/sync";
import type { DatabaseClient } from "./db";
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
const listeners = new Set<SyncListener>();

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
				listRevision: snapshot.listRevision,
				phase: "error",
				message: title,
			});
			completeActivity({ source: "anilist-sync", title: "AniList", body: "Not connected", status: "error" });
			setAppNotice(title);
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
			avatarUrl: viewer.avatarUrl ?? undefined,
		});

		let lastListBumpAt = 0;
		const synced = await syncAniListList(db, {
			token: auth.accessToken,
			userId: viewer.id,
			signal,
			onProgress: (processed) => {
				const now = Date.now();
				const bumpList = processed > 0 && shouldBumpListRevision(lastListBumpAt, now);
				if (bumpList) {
					lastListBumpAt = now;
				}
				emitRunning(synchronizingMessage(processed), processed, null, bumpList);
			},
		});

		if (signal.aborted) {
			return;
		}

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
