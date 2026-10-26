import * as Sentry from "@sentry/electron/main";
import { z } from "zod";
import { type AnilistScoreFormat, DEFAULT_SCORE_FORMAT, parseScoreFormat } from "../../lib/anilist-score";
import { accountKey, credentialsStore } from "../stores";

export const anilistAuthSchema = z.object({
	accessToken: z.string(),
	expiresAt: z.number(),
	userId: z.number(),
	username: z.string(),
	avatarUrl: z.string().optional(),
});

export type AnilistAuth = z.infer<typeof anilistAuthSchema> & {
	scoreFormat: AnilistScoreFormat;
};

export type AnilistPublicStatus = {
	connected: boolean;
	username: string | null;
	userId: number | null;
	expiresAt: number | null;
	avatarUrl: string | null;
	scoreFormat: AnilistScoreFormat;
};

function tokenKey(accountId: number): string {
	return accountKey({ service: "anilist", id: accountId });
}

function activeAccountId(): number | null {
	const active = credentialsStore.get("activeAccount");
	return active?.service === "anilist" ? active.id : null;
}

export function readAnilistAuth(): AnilistAuth | null {
	const userId = activeAccountId();
	if (userId == null) {
		return null;
	}
	const token = credentialsStore.get("tokens")?.[tokenKey(userId)];
	if (!token || typeof token.accessToken !== "string" || typeof token.expiresAt !== "number") {
		return null;
	}
	return {
		accessToken: token.accessToken,
		expiresAt: token.expiresAt,
		userId,
		username: token.username ?? "",
		avatarUrl: token.avatarUrl || undefined,
		scoreFormat: parseScoreFormat(token.scoreFormat ?? DEFAULT_SCORE_FORMAT),
	};
}

export function writeAnilistAuth(auth: AnilistAuth): void {
	credentialsStore.set("tokens", {
		...credentialsStore.get("tokens"),
		[tokenKey(auth.userId)]: {
			accessToken: auth.accessToken,
			expiresAt: auth.expiresAt,
			username: auth.username,
			avatarUrl: auth.avatarUrl?.trim() ?? "",
			scoreFormat: auth.scoreFormat,
		},
	});
	credentialsStore.set("activeAccount", { service: "anilist", id: auth.userId });
	Sentry.setUser({ id: String(auth.userId) });
}

export function clearAnilistAuth(): void {
	const userId = activeAccountId();
	if (userId != null) {
		const tokens = { ...credentialsStore.get("tokens") };
		delete tokens[tokenKey(userId)];
		credentialsStore.set("tokens", tokens);
	}
	credentialsStore.set("activeAccount", null);
	Sentry.setUser(null);
}

export function toPublicStatus(auth: AnilistAuth | null): AnilistPublicStatus {
	const avatarUrl = auth?.avatarUrl?.trim() || null;
	const scoreFormat = auth?.scoreFormat ?? DEFAULT_SCORE_FORMAT;
	if (!auth || auth.expiresAt <= Date.now()) {
		return {
			connected: false,
			username: auth?.username ?? null,
			userId: auth?.userId ?? null,
			expiresAt: auth?.expiresAt ?? null,
			avatarUrl,
			scoreFormat,
		};
	}
	return {
		connected: true,
		username: auth.username,
		userId: auth.userId,
		expiresAt: auth.expiresAt,
		avatarUrl,
		scoreFormat,
	};
}
