import { eq } from "drizzle-orm";
import {
	parseAppSettings,
	type AppSettings,
} from "../lib/schemas/app-settings";
import type { DatabaseClient } from "./db";
import { appSetting } from "./db/schema";
import { syncLoginItem } from "./startup";

type SettingsListener = (settings: AppSettings) => void;

let db: DatabaseClient | null = null;
const listeners = new Set<SettingsListener>();

export function initSettings(database: DatabaseClient): void {
	db = database;
}

export async function loadAppSettings(
	database: DatabaseClient = requiredDb(),
): Promise<AppSettings> {
	const rows = await database
		.select()
		.from(appSetting)
		.where(eq(appSetting.key, "app"))
		.limit(1);
	if (!rows[0]) {
		return parseAppSettings(null);
	}
	try {
		return parseAppSettings(JSON.parse(rows[0].value) as unknown);
	} catch {
		return parseAppSettings(null);
	}
}

export async function saveAppSettings(
	database: DatabaseClient,
	input: AppSettings,
): Promise<void> {
	await database
		.insert(appSetting)
		.values({
			key: "app",
			value: JSON.stringify(input),
		})
		.onConflictDoUpdate({
			target: appSetting.key,
			set: { value: JSON.stringify(input) },
		});
	syncLoginItem(input);
	for (const listener of listeners) {
		listener(input);
	}
}

export function subscribeSettings(listener: SettingsListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function requiredDb(): DatabaseClient {
	if (!db) {
		throw new Error("Settings database is not initialized");
	}
	return db;
}
