import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { type AccountService, credentialsStore } from "../stores";

export function appRootDir(): string {
	const dir = app.getPath("userData");
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function appCacheDir(): string {
	const dir = join(appRootDir(), "cache");
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function appFeedDir(): string {
	const dir = join(appRootDir(), "feed");
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function serviceDatabasePath(service: AccountService): string {
	const dir = join(appRootDir(), "db");
	mkdirSync(dir, { recursive: true });
	return join(dir, `${service}.db`);
}

/** One DB per list service; signed out browses the AniList catalog. */
export function activeService(): AccountService {
	return credentialsStore.get("activeAccount")?.service ?? "anilist";
}

export function appDatabasePath(): string {
	return serviceDatabasePath(activeService());
}
