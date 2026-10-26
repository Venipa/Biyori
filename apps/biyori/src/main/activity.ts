import { randomUUID } from "node:crypto";
import { and, desc, eq, lt, or } from "drizzle-orm";
import type { DatabaseClient } from "./db";
import { activity } from "./db/schema";

export const ACTIVITY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type ActivityKind = "notice" | "activity";
export type ActivityStatus = "ok" | "error";

export type LiveActivity = {
	source: string;
	title: string;
	body: string;
};

export type PersistedActivity = {
	id: string;
	kind: ActivityKind;
	source: string;
	title: string;
	body: string;
	status: ActivityStatus;
	createdAt: string;
};

export type ActivitySnapshot = {
	live: LiveActivity[];
	items: PersistedActivity[];
};

type Listener = (snapshot: ActivitySnapshot) => void;

const live = new Map<string, LiveActivity>();
let items: PersistedActivity[] = [];
let db: DatabaseClient | null = null;
const listeners = new Set<Listener>();

export function activityCutoffIso(now = Date.now()): string {
	return new Date(now - ACTIVITY_MAX_AGE_MS).toISOString();
}

export function filterFreshActivities(rows: PersistedActivity[], now = Date.now()): PersistedActivity[] {
	const cutoff = activityCutoffIso(now);
	return rows.filter((row) => row.createdAt >= cutoff);
}

function snapshot(): ActivitySnapshot {
	return {
		live: [...live.values()],
		items,
	};
}

function emit(): void {
	const next = snapshot();
	for (const listener of listeners) {
		listener(next);
	}
}

function persistRow(row: PersistedActivity): void {
	items = filterFreshActivities([row, ...items.filter((item) => item.id !== row.id)]);
	emit();
	const database = db;
	if (!database) {
		return;
	}
	void database.insert(activity).values(row);
}

async function loadPersisted(): Promise<PersistedActivity[]> {
	if (!db) {
		return filterFreshActivities(items);
	}
	const loaded = await db.select().from(activity).orderBy(desc(activity.createdAt));
	return filterFreshActivities(
		loaded.map((row) => ({
			id: row.id,
			kind: row.kind as ActivityKind,
			source: row.source,
			title: row.title,
			body: row.body,
			status: row.status as ActivityStatus,
			createdAt: row.createdAt,
		})),
	);
}

async function purgeExpired(): Promise<void> {
	if (!db) {
		items = filterFreshActivities(items);
		return;
	}
	// also drops routine ok runs persisted before they stopped being recorded
	await db.delete(activity).where(or(lt(activity.createdAt, activityCutoffIso()), and(eq(activity.kind, "activity"), eq(activity.status, "ok"))));
}

export async function initActivityCenter(database: DatabaseClient): Promise<void> {
	db = database;
	await purgeExpired();
	items = await loadPersisted();
	emit();
}

export function getActivitySnapshot(): ActivitySnapshot {
	return snapshot();
}

export function subscribeActivity(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function upsertActivity(input: { source: string; title: string; body?: string }): void {
	live.set(input.source, {
		source: input.source,
		title: input.title,
		body: input.body ?? "",
	});
	emit();
}

export function clearActivity(source: string): void {
	if (!live.delete(source)) {
		return;
	}
	emit();
}

// routine successes only clear the live row; history keeps errors and notices
export function completeActivity(input: { source: string; title: string; body?: string; status: ActivityStatus }): void {
	live.delete(input.source);
	if (input.status === "ok") {
		emit();
		return;
	}
	persistRow({
		id: randomUUID(),
		kind: "activity",
		source: input.source,
		title: input.title,
		body: input.body ?? "",
		status: input.status,
		createdAt: new Date().toISOString(),
	});
}

export function pushNotice(input: { source: string; title: string; body?: string }): void {
	persistRow({
		id: randomUUID(),
		kind: "notice",
		source: input.source,
		title: input.title,
		body: input.body ?? "",
		status: "ok",
		createdAt: new Date().toISOString(),
	});
}

export function dismissActivity(id?: string): void {
	items = id ? items.filter((item) => item.id !== id) : [];
	emit();
	if (db) {
		void (id ? db.delete(activity).where(eq(activity.id, id)) : db.delete(activity));
	}
}

export function resetActivityCenterForTests(): void {
	db = null;
	live.clear();
	items = [];
	listeners.clear();
}
