export const ANILIST_REDIRECT_URI = "biyori://anilist/callback";

const AUTHORIZE_BASE = "https://anilist.co/api/v2/oauth/authorize";

export function buildAuthorizeUrl(clientId: string): string {
	return `${AUTHORIZE_BASE}?${new URLSearchParams({
		client_id: clientId,
		response_type: "token",
	}).toString()}`;
}

export function normalizeAnilistToken(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed.includes("access_token=") && !trimmed.includes("code=")) {
		return trimmed;
	}
	const hashStart = trimmed.indexOf("#");
	const queryStart = trimmed.indexOf("?");
	const encoded = hashStart >= 0 ? trimmed.slice(hashStart + 1) : queryStart >= 0 ? trimmed.slice(queryStart + 1) : trimmed;
	const params = new URLSearchParams(encoded);
	return params.get("access_token") ?? params.get("code") ?? trimmed;
}

function isAnilistCallback(parsed: URL): boolean {
	if (parsed.protocol !== "biyori:") {
		return false;
	}
	const path = `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, "").replace(/^\/+/, "");
	return path === "anilist/callback";
}

function callbackParams(parsed: URL): URLSearchParams {
	if (parsed.hash.length > 1) {
		const hash = new URLSearchParams(parsed.hash.slice(1));
		if (hash.has("code") || hash.has("access_token")) {
			return hash;
		}
	}
	return parsed.searchParams;
}

export function parseAnilistDeepLink(raw: string): string | null {
	const trimmed = raw.trim().replace(/^["']+|["']+$/g, "");
	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return null;
	}
	if (!isAnilistCallback(parsed)) {
		return null;
	}
	const params = callbackParams(parsed);
	return params.get("access_token") ?? params.get("code");
}
