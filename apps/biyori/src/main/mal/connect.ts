import { log } from "@biyori/logger";
import { emitAuthEvent } from "../accounts/auth-events";
import { activateAccount } from "../accounts/switch";
import { credentialsStore } from "../stores";
import { requestAniListSync } from "../sync";
import { malRequest } from "./client";
import { malUserSchema } from "./map";
import { exchangeMalCode, parseMalDeepLink } from "./oauth";
import { writeMalAuth } from "./store";

let loginError: string | null = null;

export function getMalLoginError(): string | null {
	return loginError;
}

/** Handles `biyori://mal/callback`; returns false when `raw` is not ours. */
export async function handleMalDeepLink(raw: string): Promise<boolean> {
	const callback = parseMalDeepLink(raw);
	if (!callback) {
		return false;
	}
	if ("error" in callback) {
		loginError = callback.error;
		emitAuthEvent({ phase: "error", service: "myanimelist", message: callback.error });
		return true;
	}
	loginError = null;
	emitAuthEvent({ phase: "loading", service: "myanimelist" });
	try {
		const tokens = await exchangeMalCode(callback.code, callback.verifier);
		const user = malUserSchema.parse(await malRequest({ path: "/users/@me?fields=picture", token: tokens.accessToken }));
		const previous = credentialsStore.get("activeAccount");
		const ref = writeMalAuth({ ...tokens, userId: user.id, username: user.name, avatarUrl: user.picture ?? "" });
		emitAuthEvent({ phase: "success", service: "myanimelist", username: user.name });
		if (activateAccount(ref, previous) === "active") {
			requestAniListSync();
		}
	} catch (error) {
		loginError = error instanceof Error ? error.message : String(error);
		log.warn("mal connect failed", loginError);
		emitAuthEvent({ phase: "error", service: "myanimelist", message: loginError });
	}
	return true;
}
