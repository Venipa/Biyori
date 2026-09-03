import { shell } from "electron";
import { buildAuthorizeUrl } from "./oauth-url";

export { ANILIST_REDIRECT_URI, buildAuthorizeUrl, normalizeAnilistToken } from "./oauth-url";

const DEFAULT_EXPIRES_IN_SECONDS = 365 * 24 * 60 * 60;
const ANILIST_CLIENT_ID = import.meta.env.VITE_ANILIST_CLIENT_ID;
if (!ANILIST_CLIENT_ID) {
	throw new Error("VITE_ANILIST_CLIENT_ID is not set");
}

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
	return ANILIST_CLIENT_ID;
}

export function openAnilistLogin(): { opened: true } {
	const url = buildAuthorizeUrl(getAnilistClientId());
	void shell.openExternal(url);
	return { opened: true as const };
}

export function expiresAtFromToken(token: string): number {
	try {
		const payload = token.split(".")[1];
		if (!payload) {
			return Date.now() + DEFAULT_EXPIRES_IN_SECONDS * 1000;
		}
		const json: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
		if (json && typeof json === "object" && "exp" in json && typeof json.exp === "number") {
			return json.exp * 1000;
		}
	} catch {
		// JWT payload is optional; fall back to one year
	}
	return Date.now() + DEFAULT_EXPIRES_IN_SECONDS * 1000;
}
