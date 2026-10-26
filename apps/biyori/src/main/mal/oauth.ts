import { randomBytes } from "node:crypto";
import { shell } from "electron";
import { z } from "zod";
import { trackedFetch } from "../http-stats";

const MAL_REDIRECT_URI = "biyori://mal/callback";
const AUTHORIZE_URL = "https://myanimelist.net/v1/oauth2/authorize";
const TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";
const MAL_CLIENT_ID = import.meta.env.VITE_MAL_CLIENT_ID ?? "";

const tokenResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	expires_in: z.number(),
});

export type MalTokens = { accessToken: string; refreshToken: string; expiresAt: number };

// one login in flight at a time; MAL only supports the "plain" PKCE method, so challenge == verifier
let pending: { state: string; verifier: string } | null = null;

export function isMalConfigured(): boolean {
	return MAL_CLIENT_ID.length > 0;
}

export function openMalLogin(): void {
	if (!isMalConfigured()) {
		throw new Error("VITE_MAL_CLIENT_ID is not set");
	}
	pending = { state: randomBytes(16).toString("hex"), verifier: randomBytes(48).toString("base64url") };
	const query = new URLSearchParams({
		response_type: "code",
		client_id: MAL_CLIENT_ID,
		state: pending.state,
		redirect_uri: MAL_REDIRECT_URI,
		code_challenge: pending.verifier,
		code_challenge_method: "plain",
	});
	void shell.openExternal(`${AUTHORIZE_URL}?${query.toString()}`);
}

/** null when `raw` is not our MAL callback; otherwise the code or why the login failed. */
export function parseMalDeepLink(raw: string): { code: string; verifier: string } | { error: string } | null {
	let parsed: URL;
	try {
		parsed = new URL(raw.trim().replace(/^["']+|["']+$/g, ""));
	} catch {
		return null;
	}
	const path = `${parsed.hostname}${parsed.pathname}`.replace(/^\/+|\/+$/g, "");
	if (parsed.protocol !== "biyori:" || path !== "mal/callback") {
		return null;
	}
	const denied = parsed.searchParams.get("error_description") ?? parsed.searchParams.get("error");
	if (denied) {
		pending = null;
		return { error: denied };
	}
	const code = parsed.searchParams.get("code");
	if (!code || !pending || parsed.searchParams.get("state") !== pending.state) {
		return { error: "Login expired or was started elsewhere. Try again." };
	}
	const { verifier } = pending;
	pending = null;
	return { code, verifier };
}

async function requestToken(form: Record<string, string>): Promise<MalTokens> {
	const response = await trackedFetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
		body: new URLSearchParams({ client_id: MAL_CLIENT_ID, ...form }).toString(),
		signal: AbortSignal.timeout(20_000),
	});
	const text = await response.text();
	if (!response.ok) {
		throw new Error(`MyAnimeList login failed (${response.status})`);
	}
	const json = tokenResponseSchema.parse(JSON.parse(text));
	return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt: Date.now() + json.expires_in * 1000 };
}

export function exchangeMalCode(code: string, verifier: string): Promise<MalTokens> {
	return requestToken({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: MAL_REDIRECT_URI });
}

export function refreshMalToken(refreshToken: string): Promise<MalTokens> {
	return requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}
