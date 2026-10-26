import { log } from "@biyori/logger";
import { t } from "@biyori/translations/i18n";
import { emitAuthEvent } from "../accounts/auth-events";
import { activateAccount } from "../accounts/switch";
import { credentialsStore } from "../stores";
import { requestAniListSync } from "../sync";
import { clearAnilistLoginError, expiresAtFromToken, normalizeAnilistToken, setAnilistLoginError } from "./oauth";
import { parseAnilistDeepLink } from "./oauth-url";
import { readAnilistAuth, toPublicStatus, writeAnilistAuth } from "./store";
import { fetchViewer } from "./sync";

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
	emitAuthEvent({ phase: "loading", service: "anilist" });
	try {
		const status = await connectAnilistAccessToken(token);
		emitAuthEvent({ phase: "success", service: "anilist", username: status.username ?? "" });
	} catch (error) {
		const message = error instanceof Error ? error.message : t("main.anilist.connectFailed");
		log.warn("anilist connect failed", message);
		setAnilistLoginError(message);
		emitAuthEvent({ phase: "error", service: "anilist", message });
	}
}

export async function connectAnilistAccessToken(token: string) {
	clearAnilistLoginError();
	const accessToken = normalizeAnilistToken(token);
	const viewer = await fetchViewer(accessToken);
	const previous = credentialsStore.get("activeAccount");
	writeAnilistAuth({
		accessToken,
		expiresAt: expiresAtFromToken(accessToken),
		userId: viewer.id,
		username: viewer.name,
		avatarUrl: viewer.avatarUrl ?? undefined,
		scoreFormat: viewer.scoreFormat,
	});
	if (activateAccount({ service: "anilist", id: viewer.id }, previous) === "relaunching") {
		return toPublicStatus(readAnilistAuth());
	}
	requestAniListSync();
	return toPublicStatus(readAnilistAuth());
}
