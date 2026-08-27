import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appRootDir } from "../lib/app-paths";

const MAX_KEYS = 80;

let keys: string[] = [];
let loaded = false;

function filePath(): string {
	return join(appRootDir(), "applied-playback.json");
}

function load(): void {
	if (loaded) {
		return;
	}
	loaded = true;
	try {
		const parsed = JSON.parse(readFileSync(filePath(), "utf8")) as unknown;
		if (Array.isArray(parsed)) {
			keys = parsed.filter((item): item is string => typeof item === "string").slice(-MAX_KEYS);
		}
	} catch {
		keys = [];
	}
}

export function wasPlaybackApplied(key: string): boolean {
	load();
	return keys.includes(key);
}

export function rememberPlaybackApplied(key: string): void {
	load();
	keys = keys.filter((item) => item !== key);
	keys.push(key);
	if (keys.length > MAX_KEYS) {
		keys = keys.slice(-MAX_KEYS);
	}
	try {
		writeFileSync(filePath(), JSON.stringify(keys));
	} catch {
		/* ignore disk errors; in-memory skip still holds for this session */
	}
}
