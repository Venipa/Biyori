import { log } from "@biyori/logger";
import { requestAniListSync } from "../sync";
import { clearAnilistLoginError, expiresAtFromToken, normalizeAnilistToken, setAnilistLoginError } from "./oauth";
import { parseAnilistDeepLink } from "./oauth-url";
import { readAnilistAuth, toPublicStatus, writeAnilistAuth } from "./store";
import { fetchViewer } from "./sync";

type AuthListener = (username: string) => void;
type AuthErrorListener = (message: string) => void;

const listeners = new Set<AuthListener>();
const errorListeners = new Set<AuthErrorListener>();
let lastUsername: string | null = null;

export function subscribeAnilistAuthSuccess(listener: AuthListener): () => void {
	if (lastUsername) {
		listener(lastUsername);
	}
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function subscribeAnilistAuthError(listener: AuthErrorListener): () => void {
	errorListeners.add(listener);
	return () => {
		errorListeners.delete(listener);
	};
}

function describeDeepLink(raw: string): Record<string, unknown> {
	const trimmed = raw.trim().replace(/^["']+|["']+$/g, "");
	try {
		const parsed = new URL(trimmed);
		const hashParams = parsed.hash.length > 1 ? new URLSearchParams(parsed.hash.slice(1)) : null;
		return {
			protocol: parsed.protocol,
			hostname: parsed.hostname,
			host: parsed.host,
			pathname: parsed.pathname,
			queryKeys: [...parsed.searchParams.keys()],
			hashKeys: hashParams ? [...hashParams.keys()] : [],
		};
	} catch {
		return { invalidUrl: true };
	}
}

export async function handleBiyoriDeepLink(raw: string): Promise<void> {
	const token = parseAnilistDeepLink(raw);
	log.debug("anilist deeplink parse", { ...describeDeepLink(raw), matched: Boolean(token) });
	if (!token) {
		return;
	}
	try {
		await connectAnilistAccessToken(token);
	} catch (error) {
		const message = error instanceof Error ? error.message : "AniList connect failed";
		log.warn("anilist connect failed", message);
		setAnilistLoginError(message);
		for (const listener of errorListeners) {
			listener(message);
		}
	}
}

export async function connectAnilistAccessToken(token: string) {
	clearAnilistLoginError();
	const accessToken = normalizeAnilistToken(token);
	const viewer = await fetchViewer(accessToken);
	writeAnilistAuth({
		accessToken,
		expiresAt: expiresAtFromToken(accessToken),
		userId: viewer.id,
		username: viewer.name,
	});
	requestAniListSync();
	lastUsername = viewer.name;
	for (const listener of listeners) {
		listener(viewer.name);
	}
	return toPublicStatus(readAnilistAuth());
}
