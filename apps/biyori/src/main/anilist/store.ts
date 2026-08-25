import { eq } from "drizzle-orm";
import { z } from "zod";
import type { DatabaseClient } from "../db";
import { appSetting } from "../db/schema";

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

const ANILIST_SETTING_KEY = "anilist";

export async function readAnilistAuth(db: DatabaseClient): Promise<AnilistAuth | null> {
	const rows = await db.select().from(appSetting).where(eq(appSetting.key, ANILIST_SETTING_KEY)).limit(1);
	if (!rows[0]) {
		return null;
	}
	try {
		const parsed = anilistAuthSchema.safeParse(JSON.parse(rows[0].value));
		if (!parsed.success) {
			return null;
		}
		return parsed.data;
	} catch {
		return null;
	}
}

export async function writeAnilistAuth(db: DatabaseClient, auth: AnilistAuth): Promise<void> {
	const value = JSON.stringify(auth);
	await db.insert(appSetting).values({ key: ANILIST_SETTING_KEY, value }).onConflictDoUpdate({
		target: appSetting.key,
		set: { value },
	});
}

export async function clearAnilistAuth(db: DatabaseClient): Promise<void> {
	await db.delete(appSetting).where(eq(appSetting.key, ANILIST_SETTING_KEY));
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
