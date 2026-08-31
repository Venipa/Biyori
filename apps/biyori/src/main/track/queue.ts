import { randomUUID } from "node:crypto";
import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { type ListStatus, listStatusSchema } from "../../shared/list";
import { toAnilistStatus, toFuzzyDateInput, toListEntryRow } from "../anilist/map";
import { readAnilistAuth } from "../anilist/store";
import { saveMediaListEntry } from "../anilist/sync";
import type { DatabaseClient } from "../db";
import { anime, history, listEntry, syncQueue } from "../db/schema";
import { clearActivity, completeActivity, upsertActivity } from "../activity";
import { setAppNotice } from "../notice";

export const queuePayloadSchema = z.object({
	status: listStatusSchema.optional(),
	progress: z.number().int().optional(),
	score: z.number().int().nullable().optional(),
	notes: z.string().optional(),
	rewatching: z.boolean().optional(),
	timesRewatched: z.number().int().optional(),
	dateStarted: z.string().nullable().optional(),
	dateCompleted: z.string().nullable().optional(),
});

export type QueuePayload = z.infer<typeof queuePayloadSchema>;

const QUEUE_RETRY_MS = 5 * 60 * 1000;

function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

function nowStamp(): string {
	return new Date().toISOString().replace("T", " ").slice(0, 16);
}

function parsePayload(raw: string): QueuePayload {
	const parsed = queuePayloadSchema.safeParse(JSON.parse(raw) as unknown);
	return parsed.success ? parsed.data : {};
}

function yieldToEventLoop(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

let flushing = false;
let flushAgain = false;
let retryTimer: ReturnType<typeof setInterval> | null = null;
let queueDb: DatabaseClient | null = null;

export async function applyLocalUpdate(db: DatabaseClient, animeId: number, payload: QueuePayload): Promise<void> {
	const rows = await db.select().from(listEntry).where(eq(listEntry.animeId, animeId)).limit(1);
	const current = rows[0];
	if (!current) {
		return;
	}
	const progress = payload.progress ?? current.episodesWatched;
	const status = payload.status ?? (current.status as ListStatus);
	const dateStarted = payload.dateStarted !== undefined ? payload.dateStarted : progress >= 1 && !current.dateStarted ? todayIsoDate() : current.dateStarted;
	const dateCompleted = payload.dateCompleted !== undefined ? payload.dateCompleted : status === "Completed" && !current.dateCompleted ? todayIsoDate() : current.dateCompleted;
	await db
		.update(listEntry)
		.set({
			status,
			episodesWatched: progress,
			score: payload.score !== undefined ? payload.score : current.score,
			notes: payload.notes ?? current.notes,
			rewatching: payload.rewatching !== undefined ? (payload.rewatching ? 1 : 0) : current.rewatching,
			timesRewatched: payload.timesRewatched ?? current.timesRewatched,
			dateStarted,
			dateCompleted,
			started: dateStarted,
			completed: dateCompleted,
			lastUpdated: new Date().toISOString(),
		})
		.where(eq(listEntry.animeId, animeId));
}

export async function countQueued(db: DatabaseClient): Promise<number> {
	const rows = await db.select({ value: count() }).from(syncQueue);
	return rows[0]?.value ?? 0;
}

export async function enqueueUpdate(
	db: DatabaseClient,
	options: {
		animeId: number;
		title: string;
		episode: number;
		payload: QueuePayload;
	},
): Promise<void> {
	await applyLocalUpdate(db, options.animeId, options.payload);
	const existing = await db.select().from(syncQueue).where(eq(syncQueue.animeId, options.animeId)).limit(1);
	const merged: QueuePayload = {
		...(existing[0] ? parsePayload(existing[0].payload) : {}),
		...options.payload,
	};
	await db
		.insert(syncQueue)
		.values({
			animeId: options.animeId,
			mode: "update",
			payload: JSON.stringify(merged),
			createdAt: new Date().toISOString(),
		})
		.onConflictDoUpdate({
			target: syncQueue.animeId,
			set: {
				mode: "update",
				payload: JSON.stringify(merged),
			},
		});
	const queued = await db
		.select()
		.from(history)
		.where(and(eq(history.kind, "queued"), eq(history.animeId, options.animeId)))
		.limit(1);
	if (queued[0]) {
		await db
			.update(history)
			.set({
				title: options.title,
				episode: options.episode,
				lastModified: nowStamp(),
			})
			.where(eq(history.id, queued[0].id));
	} else {
		await db.insert(history).values({
			id: randomUUID(),
			animeId: options.animeId,
			title: options.title,
			episode: options.episode,
			lastModified: nowStamp(),
			kind: "queued",
		});
	}
	scheduleFlush(db);
}

/** Start periodic retry (Taiga-style history timer). Safe to call once. */
export function initQueueFlush(db: DatabaseClient): void {
	queueDb = db;
	if (retryTimer) {
		return;
	}
	retryTimer = setInterval(() => {
		if (queueDb) {
			scheduleFlush(queueDb);
		}
	}, QUEUE_RETRY_MS);
	scheduleFlush(db);
}

function scheduleFlush(db: DatabaseClient): void {
	setTimeout(() => {
		void flushQueue(db);
	}, 0);
}

export async function flushQueue(db: DatabaseClient): Promise<void> {
	if (flushing) {
		flushAgain = true;
		return;
	}
	flushing = true;
	try {
		do {
			flushAgain = false;
			await flushNext(db);
		} while (flushAgain);
	} finally {
		flushing = false;
	}
}

async function flushNext(db: DatabaseClient): Promise<void> {
	const auth = readAnilistAuth();
	if (!auth || auth.expiresAt <= Date.now()) {
		return;
	}

	const items = await db.select().from(syncQueue).orderBy(asc(syncQueue.createdAt)).limit(1);
	const item = items[0];
	if (!item) {
		return;
	}

	const rows = await db
		.select({
			id: anime.id,
			status: listEntry.status,
			rewatching: listEntry.rewatching,
			episodesWatched: listEntry.episodesWatched,
			score: listEntry.score,
			notes: listEntry.notes,
			timesRewatched: listEntry.timesRewatched,
			dateStarted: listEntry.dateStarted,
			dateCompleted: listEntry.dateCompleted,
		})
		.from(anime)
		.innerJoin(listEntry, eq(listEntry.animeId, anime.id))
		.where(eq(anime.id, item.animeId))
		.limit(1);
	const row = rows[0];
	if (!row) {
		await db.delete(syncQueue).where(eq(syncQueue.animeId, item.animeId));
		flushAgain = true;
		return;
	}

	const payload = parsePayload(item.payload);
	const remaining = await countQueued(db);
	const title = remaining > 1 ? `Updating anime list... (${remaining} queued)` : "Updating anime list...";
	setAppNotice(title);
	upsertActivity({ source: "list-update", title });

	try {
		const saved = await saveMediaListEntry({
			token: auth.accessToken,
			mediaId: row.id,
			status: toAnilistStatus((payload.status ?? row.status) as ListStatus, payload.rewatching ?? row.rewatching === 1),
			progress: payload.progress ?? row.episodesWatched,
			score: payload.score === undefined ? row.score : payload.score,
			repeat: payload.timesRewatched ?? row.timesRewatched,
			notes: payload.notes ?? row.notes,
			startedAt: toFuzzyDateInput(payload.dateStarted ?? row.dateStarted),
			completedAt: toFuzzyDateInput(payload.dateCompleted ?? row.dateCompleted),
		});

		const listRow = toListEntryRow(item.animeId, saved);
		await db
			.update(listEntry)
			.set({
				status: listRow.status,
				episodesWatched: listRow.episodesWatched,
				score: listRow.score,
				notes: listRow.notes,
				rewatching: listRow.rewatching,
				timesRewatched: listRow.timesRewatched,
				dateStarted: listRow.dateStarted ?? row.dateStarted,
				dateCompleted: listRow.dateCompleted ?? row.dateCompleted,
				started: listRow.started ?? row.dateStarted,
				completed: listRow.completed ?? row.dateCompleted,
				lastUpdated: listRow.lastUpdated,
				anilistListId: listRow.anilistListId,
			})
			.where(eq(listEntry.animeId, item.animeId));

		await db.delete(syncQueue).where(eq(syncQueue.animeId, item.animeId));
		await db
			.update(history)
			.set({ kind: "history", lastModified: nowStamp() })
			.where(and(eq(history.kind, "queued"), eq(history.animeId, item.animeId)));

		const left = await countQueued(db);
		if (left === 0) {
			setAppNotice("");
			clearActivity("list-update");
		} else {
			flushAgain = true;
			await yieldToEventLoop();
		}
	} catch {
		const title = "List update failed; will retry";
		setAppNotice(title);
		completeActivity({ source: "list-update", title, status: "error" });
		/* stay queued; retry timer will try again */
	}
}
