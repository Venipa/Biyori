import * as Sentry from "@sentry/electron/main";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { DatabaseClient } from "../db";
import { account } from "../db/schema";
import { credentialsStore } from "../stores";

export const anilistAuthSchema = z.object({
	accessToken: z.string(),
	expiresAt: z.number(),
	userId: z.number(),
	username: z.string(),
	avatarUrl: z.string().optional(),
});

export type AnilistAuth = z.infer<typeof anilistAuthSchema>;

export type AnilistPublicStatus = {
	connected: boolean;
	username: string | null;
	userId: number | null;
	expiresAt: number | null;
	avatarUrl: string | null;
};

let db: DatabaseClient | null = null;

function tokenKey(accountId: number): string {
	return String(accountId);
}

export function initAnilistAuth(database: DatabaseClient): void {
	db = database;
}

function activeAccountId(): number | null {
	const id = credentialsStore.get("activeAccountId");
	return typeof id === "number" && Number.isFinite(id) ? id : null;
}

function readToken(accountId: number): { accessToken: string; expiresAt: number } | null {
	const token = credentialsStore.get("tokens")?.[tokenKey(accountId)];
	if (!token || typeof token.accessToken !== "string" || typeof token.expiresAt !== "number") {
		return null;
	}
	return token;
}

function readAccountRow(accountId: number): { username: string; avatarUrl: string } | null {
	if (!db) {
		return null;
	}
	const row = db.select({ username: account.username, avatarUrl: account.avatarUrl }).from(account).where(eq(account.id, accountId)).get();
	return row ?? null;
}

function upsertAccountRow(auth: AnilistAuth): void {
	if (!db) {
		return;
	}
	db.insert(account)
		.values({
			id: auth.userId,
			username: auth.username,
			avatarUrl: auth.avatarUrl?.trim() ?? "",
		})
		.onConflictDoUpdate({
			target: account.id,
			set: {
				username: auth.username,
				avatarUrl: auth.avatarUrl?.trim() ?? "",
			},
		})
		.run();
}

export function readAnilistAuth(): AnilistAuth | null {
	const userId = activeAccountId();
	if (userId == null) {
		return null;
	}
	const token = readToken(userId);
	if (!token) {
		return null;
	}
	const row = readAccountRow(userId);
	return {
		accessToken: token.accessToken,
		expiresAt: token.expiresAt,
		userId,
		username: row?.username ?? "",
		avatarUrl: row?.avatarUrl || undefined,
	};
}

export function writeAnilistAuth(auth: AnilistAuth): void {
	upsertAccountRow(auth);
	const tokens = { ...credentialsStore.get("tokens") };
	tokens[tokenKey(auth.userId)] = {
		accessToken: auth.accessToken,
		expiresAt: auth.expiresAt,
	};
	credentialsStore.set("tokens", tokens);
	credentialsStore.set("activeAccountId", auth.userId);
	Sentry.setUser({ id: String(auth.userId) });
}

export function clearAnilistAuth(): void {
	const userId = activeAccountId();
	if (userId != null) {
		const tokens = { ...credentialsStore.get("tokens") };
		delete tokens[tokenKey(userId)];
		credentialsStore.set("tokens", tokens);
	}
	credentialsStore.set("activeAccountId", null);
	Sentry.setUser(null);
}

export function toPublicStatus(auth: AnilistAuth | null): AnilistPublicStatus {
	const avatarUrl = auth?.avatarUrl?.trim() || null;
	if (!auth || auth.expiresAt <= Date.now()) {
		return {
			connected: false,
			username: auth?.username ?? null,
			userId: auth?.userId ?? null,
			expiresAt: auth?.expiresAt ?? null,
			avatarUrl,
		};
	}
	return {
		connected: true,
		username: auth.username,
		userId: auth.userId,
		expiresAt: auth.expiresAt,
		avatarUrl,
	};
}
