import type { Conf } from "electron-conf/main";
import { type AppSettings, type AppSettingsPatch, appSettingsSchema, parseAppSettings } from "../../lib/schemas/app-settings";
import { createEncryptedStore, createYmlStore } from "../lib/store/createYmlStore";
import { syncLoginItem } from "../startup";
import { appStoreMigrations } from "./migrations";

export type CredentialsFile = {
	anilist?: {
		accessToken: string;
		expiresAt: number;
		userId: number;
		username: string;
	} | null;
};

const defaults = parseAppSettings(null);

export const appStore: Conf<AppSettings> = createYmlStore<AppSettings>("app", {
	ext: ".yml",
	defaults,
	migrations: appStoreMigrations,
});

export const credentialsStore = createEncryptedStore<CredentialsFile>("credentials", {
	defaults: {},
});

type SettingsListener = (settings: AppSettings) => void;

const listeners = new Set<SettingsListener>();

function omitUndefined(patch: AppSettingsPatch): Record<string, unknown> {
	const next: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(patch)) {
		if (value !== undefined) {
			next[key] = value;
		}
	}
	return next;
}

export function loadAppSettings(): AppSettings {
	return parseAppSettings(appStore.store);
}

export function saveAppSettings(input: AppSettings): AppSettings {
	const next = appSettingsSchema.parse(input);
	appStore.set(next);
	syncLoginItem(next);
	for (const listener of listeners) {
		listener(next);
	}
	return next;
}

export function patchAppSettings(patch: AppSettingsPatch): AppSettings {
	return saveAppSettings(
		appSettingsSchema.parse({
			...loadAppSettings(),
			...omitUndefined(patch),
		}),
	);
}

export function subscribeSettings(listener: SettingsListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
