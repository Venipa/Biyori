import { describe, expect, test } from "bun:test";
import { defaultTorrentFilters } from "./torrent-filter";
import { parseTorrentFilterExport } from "./torrent-filter";
import { parseAppSettings } from "./app-settings";

describe("parseAppSettings torrent filters", () => {
	test("does not convert legacy torrent flags into rules", () => {
		const parsed = parseAppSettings({
			torrentWatchingOnly: false,
			torrentDiscardNotInList: true,
			torrentDiscardAnimeIds: [42],
		});
		expect(parsed.torrentFilters).toEqual(defaultTorrentFilters());
		expect(
			Object.prototype.hasOwnProperty.call(parsed, "torrentWatchingOnly"),
		).toBe(false);
	});

	test("keeps an explicit empty filter list", () => {
		const parsed = parseAppSettings({ torrentFilters: [] });
		expect(parsed.torrentFilters).toEqual([]);
	});

	test("parses a public torrent-filter export payload", () => {
		const filters = defaultTorrentFilters();
		expect(
			parseTorrentFilterExport({
				kind: "torrent-filters",
				filters,
			}),
		).toEqual(filters);
	});
});
