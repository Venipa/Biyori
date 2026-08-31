import type { Conf } from "electron-conf/main";
import { parseTorrentFiltersFile, type TorrentFiltersFile, torrentFiltersFileDefaultValues, torrentFiltersFileSchema } from "../../../lib/schemas/torrent-filter";
import { createYmlStore } from "../../lib/store/createYmlStore";
import { filtersStoreMigrations } from "./migrations";

export const filtersStore: Conf<TorrentFiltersFile> = createYmlStore<TorrentFiltersFile>("filters", {
	ext: ".yml",
	defaults: torrentFiltersFileDefaultValues,
	migrations: filtersStoreMigrations,
	zodSchema: torrentFiltersFileSchema,
});

type FiltersListener = (filters: TorrentFiltersFile) => void;

const listeners = new Set<FiltersListener>();

function omitUndefined(patch: Record<string, unknown>): Record<string, unknown> {
	const next: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(patch)) {
		if (value !== undefined) {
			next[key] = value;
		}
	}
	return next;
}

export function loadTorrentFiltersFile(): TorrentFiltersFile {
	return parseTorrentFiltersFile(filtersStore.store);
}

export function saveTorrentFiltersFile(input: TorrentFiltersFile): TorrentFiltersFile {
	const next = torrentFiltersFileSchema.parse(input);
	filtersStore.set(next);
	for (const listener of listeners) {
		listener(next);
	}
	return next;
}

export function patchTorrentFiltersFile(patch: Partial<TorrentFiltersFile>): TorrentFiltersFile {
	return saveTorrentFiltersFile({
		...loadTorrentFiltersFile(),
		...omitUndefined(patch),
	});
}

export function subscribeFilters(listener: FiltersListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
