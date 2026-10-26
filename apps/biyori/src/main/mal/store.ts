import { type AccountRef, accountKey, credentialsStore } from "../stores";
import { MalApiError } from "./client";
import { type MalTokens, refreshMalToken } from "./oauth";

export type MalAuth = MalTokens & { userId: number; username: string; avatarUrl: string };

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function activeMalId(): number | null {
	const active = credentialsStore.get("activeAccount");
	return active?.service === "myanimelist" ? active.id : null;
}

export function readMalAuth(): MalAuth | null {
	const userId = activeMalId();
	if (userId == null) {
		return null;
	}
	const token = credentialsStore.get("tokens")?.[accountKey({ service: "myanimelist", id: userId })];
	if (!token?.refreshToken) {
		return null;
	}
	return { accessToken: token.accessToken, expiresAt: token.expiresAt, refreshToken: token.refreshToken, userId, username: token.username ?? "", avatarUrl: token.avatarUrl ?? "" };
}

/** Saves tokens + profile; does not change which account is active. */
export function writeMalAuth(auth: MalAuth): AccountRef {
	const ref: AccountRef = { service: "myanimelist", id: auth.userId };
	credentialsStore.set("tokens", {
		...credentialsStore.get("tokens"),
		[accountKey(ref)]: {
			accessToken: auth.accessToken,
			expiresAt: auth.expiresAt,
			refreshToken: auth.refreshToken,
			username: auth.username,
			avatarUrl: auth.avatarUrl,
			scoreFormat: "POINT_10",
		},
	});
	return ref;
}

/** Valid access token for the active MAL account, refreshing when close to expiry. */
async function malAccessToken(force = false): Promise<string | null> {
	const auth = readMalAuth();
	if (!auth) {
		return null;
	}
	if (!force && auth.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
		return auth.accessToken;
	}
	const next = await refreshMalToken(auth.refreshToken);
	writeMalAuth({ ...auth, ...next });
	return next.accessToken;
}

/** Runs `call` with a fresh token, retrying once after a forced refresh on 401. */
export async function withMalToken<T>(call: (token: string) => Promise<T>): Promise<T> {
	const token = await malAccessToken();
	if (!token) {
		throw new MalApiError("MyAnimeList is not connected", 401);
	}
	try {
		return await call(token);
	} catch (error) {
		if (!(error instanceof MalApiError) || error.status !== 401) {
			throw error;
		}
		const refreshed = await malAccessToken(true);
		if (!refreshed) {
			throw error;
		}
		return call(refreshed);
	}
}
