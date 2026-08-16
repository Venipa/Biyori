import { app } from "electron";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const APP_FOLDER = "Biyori";

export function appRootDir(): string {
	const dir = join(app.getPath("appData"), APP_FOLDER);
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function appCacheDir(): string {
	const dir = join(appRootDir(), "cache");
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function appDatabasePath(): string {
	return join(appRootDir(), "biyori.sqlite");
}
