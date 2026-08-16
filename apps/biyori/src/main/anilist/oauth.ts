import { shell } from "electron";

const AUTHORIZE_BASE = "https://anilist.co/api/v2/oauth/authorize";
const DEFAULT_EXPIRES_IN_SECONDS = 365 * 24 * 60 * 60;

let loginError: string | null = null;

export function getAnilistLoginError(): string | null {
	return loginError;
}

export function clearAnilistLoginError(): void {
	loginError = null;
}

export function setAnilistLoginError(message: string): void {
	loginError = message;
}

export function getAnilistClientId(): string {
	return process.env.ANILIST_CLIENT_ID?.trim() ?? "";
}

export function buildAuthorizeUrl(clientId: string): string {
	return `${AUTHORIZE_BASE}?${new URLSearchParams({
		client_id: clientId,
		response_type: "token",
	}).toString()}`;
}

export function openAnilistLogin(): { opened: true } {
	const clientId = getAnilistClientId();
	if (!clientId) {
		throw new Error("ANILIST_CLIENT_ID is not set");
	}
	const url = buildAuthorizeUrl(clientId);
	void shell.openExternal(url);
	return { opened: true as const };
}

export function normalizeAnilistToken(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed.includes("access_token=")) {
		return trimmed;
	}
	const hashStart = trimmed.indexOf("#");
	const query = hashStart >= 0 ? trimmed.slice(hashStart + 1) : trimmed;
	return new URLSearchParams(query).get("access_token") ?? trimmed;
}

export function expiresAtFromToken(token: string): number {
	try {
		const payload = token.split(".")[1];
		if (!payload) {
			return Date.now() + DEFAULT_EXPIRES_IN_SECONDS * 1000;
		}
		const json: unknown = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8"),
		);
		if (
			json &&
			typeof json === "object" &&
			"exp" in json &&
			typeof json.exp === "number"
		) {
			return json.exp * 1000;
		}
	} catch {
		// JWT payload is optional; fall back to one year
	}
	return Date.now() + DEFAULT_EXPIRES_IN_SECONDS * 1000;
}
