import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

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

export function appDatabasePath(): string {
	return join(appRootDir(), "biyori.db");
}
