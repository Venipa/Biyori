import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../db";
import { relationsCache } from "../db/schema";
import { trackedFetch } from "../http-stats";

const RELATIONS_URL = "https://raw.githubusercontent.com/erengy/anime-relations/master/anime-relations.txt";
const CACHE_ID = "anime-relations";
const REFRESH_MS = 24 * 60 * 60 * 1000;

type RelationRule = {
	fromId: number;
	fromStart: number;
	fromEnd: number | null;
	toId: number;
	toStart: number;
};

let rules: RelationRule[] = [];
let loadedAt = 0;

function parseRange(value: string): { start: number; end: number | null } {
	const [startRaw, endRaw] = value.split("-");
	const start = Number(startRaw);
	if (!Number.isFinite(start)) {
		return { start: 1, end: null };
	}
	if (!endRaw || endRaw === "?") {
		return { start, end: null };
	}
	const end = Number(endRaw);
	return { start, end: Number.isFinite(end) ? end : null };
}

function parseIds(value: string): number | null {
	const parts = value.split("|");
	const anilist = Number(parts[2]);
	return Number.isFinite(anilist) && anilist > 0 ? anilist : null;
}

export function parseRelations(body: string): RelationRule[] {
	const next: RelationRule[] = [];
	for (const line of body.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("- ")) {
			continue;
		}
		const mapped = trimmed.slice(2).split("->");
		if (mapped.length !== 2) {
			continue;
		}
		const [fromRaw, toRaw] = mapped.map((part) => part.trim());
		const [fromIds, fromEps] = fromRaw.split(":");
		const [toIds, toEps] = toRaw.split(":");
		const fromId = parseIds(fromIds);
		const toId = parseIds(toIds);
		if (fromId == null || toId == null || !fromEps || !toEps) {
			continue;
		}
		const fromRange = parseRange(fromEps);
		const toRange = parseRange(toEps);
		next.push({
			fromId,
			fromStart: fromRange.start,
			fromEnd: fromRange.end,
			toId,
			toStart: toRange.start,
		});
	}
	return next;
}

export function applyRelation(id: number, episode: number): { id: number; episode: number } {
	for (const rule of rules) {
		if (rule.fromId !== id) {
			continue;
		}
		if (episode < rule.fromStart) {
			continue;
		}
		if (rule.fromEnd != null && episode > rule.fromEnd) {
			continue;
		}
		return {
			id: rule.toId,
			episode: episode - rule.fromStart + rule.toStart,
		};
	}
	return { id, episode };
}

export async function refreshRelations(db: DatabaseClient): Promise<void> {
	if (rules.length > 0 && Date.now() - loadedAt < REFRESH_MS) {
		return;
	}
	const cached = await db.select().from(relationsCache).where(eq(relationsCache.id, CACHE_ID)).limit(1);
	const cachedAt = cached[0] ? new Date(cached[0].fetchedAt).getTime() : 0;
	if (cached[0] && Date.now() - cachedAt < REFRESH_MS) {
		rules = parseRelations(cached[0].body);
		loadedAt = Date.now();
		return;
	}
	try {
		const response = await trackedFetch(RELATIONS_URL);
		if (!response.ok) {
			if (cached[0]) {
				rules = parseRelations(cached[0].body);
				loadedAt = Date.now();
			}
			return;
		}
		const body = await response.text();
		rules = parseRelations(body);
		loadedAt = Date.now();
		await db
			.insert(relationsCache)
			.values({
				id: CACHE_ID,
				body,
				fetchedAt: new Date().toISOString(),
			})
			.onConflictDoUpdate({
				target: relationsCache.id,
				set: {
					body,
					fetchedAt: new Date().toISOString(),
				},
			});
	} catch {
		if (cached[0]) {
			rules = parseRelations(cached[0].body);
			loadedAt = Date.now();
		}
	}
}
