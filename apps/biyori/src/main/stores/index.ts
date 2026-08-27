import type { AppSettingsPatch, SettingsFormPatch, SettingsFormValues } from "../../lib/schemas/app-settings";
import type { TorrentFiltersFile } from "../../lib/schemas/torrent-filter";
import { loadAppSettings, patchAppSettings } from "./app";
import { loadTorrentFiltersFile, patchTorrentFiltersFile } from "./filters";

export { appStore, appStoreMigrations, loadAppSettings, patchAppSettings, saveAppSettings, subscribeSettings } from "./app";
export { credentialsStore, credentialsStoreMigrations, type CredentialsFile } from "./credentials";
export { filtersStore, filtersStoreMigrations, loadTorrentFiltersFile, patchTorrentFiltersFile, saveTorrentFiltersFile, subscribeFilters } from "./filters";

function omitUndefined(patch: Record<string, unknown>): Record<string, unknown> {
	const next: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(patch)) {
		if (value !== undefined) {
			next[key] = value;
		}
	}
	return next;
}

export function loadSettingsFormValues(): SettingsFormValues {
	const file = loadTorrentFiltersFile();
	return {
		...loadAppSettings(),
		torrentFilterEnabled: file.enabled,
		torrentFilters: file.filters,
	};
}

export function patchSettingsForm(patch: SettingsFormPatch): SettingsFormValues {
	const raw = omitUndefined(patch as Record<string, unknown>);
	const appPatch: Record<string, unknown> = { ...raw };
	const filterPatch: Partial<TorrentFiltersFile> = {};
	if ("torrentFilterEnabled" in raw) {
		filterPatch.enabled = raw.torrentFilterEnabled as boolean;
		delete appPatch.torrentFilterEnabled;
	}
	if ("torrentFilters" in raw) {
		filterPatch.filters = raw.torrentFilters as TorrentFiltersFile["filters"];
		delete appPatch.torrentFilters;
	}
	if (Object.keys(filterPatch).length > 0) {
		patchTorrentFiltersFile(filterPatch);
	}
	if (Object.keys(appPatch).length > 0) {
		patchAppSettings(appPatch as AppSettingsPatch);
	}
	return loadSettingsFormValues();
}
