import { applyRelationRule, type RelationRule, redirectIfOutOfRange } from "@biyori/recognition";
import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../db";
import { relationsCache } from "../db/schema";
import { trackedFetch } from "../http-stats";

const RELATIONS_URL = "https://raw.githubusercontent.com/erengy/anime-relations/master/anime-relations.txt";
const CACHE_ID = "anime-relations";
const REFRESH_MS = 24 * 60 * 60 * 1000;

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

/** ids are `mal|kitsu|anilist`; `column` picks the active service's */
function parseIds(value: string, column: number): number | null {
	const id = Number(value.split("|")[column]);
	return Number.isFinite(id) && id > 0 ? id : null;
}

export function parseRelations(body: string, column = 2): RelationRule[] {
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
		const [toIds, toEpsRaw] = toRaw.split(":");
		const bang = toEpsRaw?.endsWith("!") ?? false;
		const toEps = bang ? toEpsRaw.slice(0, -1) : toEpsRaw;
		const fromId = parseIds(fromIds, column);
		const toId = parseIds(toIds, column);
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
		if (bang) {
			next.push({
				fromId: toId,
				fromStart: fromRange.start,
				fromEnd: fromRange.end,
				toId,
				toStart: toRange.start,
			});
		}
	}
	return next;
}

export function relationRules(): RelationRule[] {
	return rules;
}

export function toHanaRelations() {
	return rules.map((rule) => ({
		fromId: rule.fromId,
		fromStart: rule.fromStart,
		toId: rule.toId,
		toStart: rule.toStart,
		...(rule.fromEnd == null ? {} : { fromEnd: rule.fromEnd }),
	}));
}

export function applyRelation(id: number, episode: number): { id: number; episode: number } {
	return applyRelationRule(id, episode, rules);
}

export function redirectEpisode(match: { id: number; episodes: number }, episode: number): { id: number; episode: number } {
	return redirectIfOutOfRange(match, episode, rules);
}

export function replaceRelationRules(next: RelationRule[]): void {
	rules = next;
	loadedAt = Date.now();
}

/** `column`: the active provider's `relationsColumn`. */
export async function refreshRelations(db: DatabaseClient, column: number): Promise<void> {
	if (rules.length > 0 && Date.now() - loadedAt < REFRESH_MS) {
		return;
	}
	const cached = await db.select().from(relationsCache).where(eq(relationsCache.id, CACHE_ID)).limit(1);
	const cachedAt = cached[0] ? new Date(cached[0].fetchedAt).getTime() : 0;
	if (cached[0] && Date.now() - cachedAt < REFRESH_MS) {
		rules = parseRelations(cached[0].body, column);
		loadedAt = Date.now();
		return;
	}
	try {
		const response = await trackedFetch(RELATIONS_URL);
		if (!response.ok) {
			if (cached[0]) {
				rules = parseRelations(cached[0].body, column);
				loadedAt = Date.now();
			}
			return;
		}
		const body = await response.text();
		rules = parseRelations(body, column);
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
			rules = parseRelations(cached[0].body, column);
			loadedAt = Date.now();
		}
	}
}
