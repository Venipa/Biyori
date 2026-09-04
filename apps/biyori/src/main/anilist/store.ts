import * as Sentry from "@sentry/electron/main";
import { z } from "zod";
import { credentialsStore } from "../stores";

export const anilistAuthSchema = z.object({
	accessToken: z.string(),
	expiresAt: z.number(),
	userId: z.number(),
	username: z.string(),
});

export type AnilistAuth = z.infer<typeof anilistAuthSchema>;

export type AnilistPublicStatus = {
	connected: boolean;
	username: string | null;
	userId: number | null;
	expiresAt: number | null;
};

export function readAnilistAuth(): AnilistAuth | null {
	const parsed = anilistAuthSchema.safeParse(credentialsStore.get("anilist"));
	return parsed.success ? parsed.data : null;
}

export function writeAnilistAuth(auth: AnilistAuth): void {
	credentialsStore.set("anilist", auth);
	Sentry.setUser({ id: String(auth.userId) });
}

export function clearAnilistAuth(): void {
	credentialsStore.delete("anilist");
	Sentry.setUser(null);
}

export function toPublicStatus(auth: AnilistAuth | null): AnilistPublicStatus {
	if (!auth || auth.expiresAt <= Date.now()) {
		return {
			connected: false,
			username: auth?.username ?? null,
			userId: auth?.userId ?? null,
			expiresAt: auth?.expiresAt ?? null,
		};
	}
	return {
		connected: true,
		username: auth.username,
		userId: auth.userId,
		expiresAt: auth.expiresAt,
	};
}
