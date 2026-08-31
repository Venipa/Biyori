import { describe, expect, test } from "bun:test";
import { parseAppSettings } from "./app-settings";
import { defaultTorrentFilters, parseTorrentFilterExport, parseTorrentFiltersFile } from "./torrent-filter";

describe("parseAppSettings torrent filters", () => {
	test("does not convert legacy torrent flags into rules", () => {
		const parsed = parseAppSettings({
			torrentWatchingOnly: false,
			torrentDiscardNotInList: true,
			torrentDiscardAnimeIds: [42],
		});
		expect(Object.hasOwn(parsed, "torrentFilters")).toBe(false);
		expect(Object.hasOwn(parsed, "torrentWatchingOnly")).toBe(false);
	});

	test("drops leftover torrentFilters from app.yml", () => {
		const parsed = parseAppSettings({ torrentFilters: [] });
		expect(Object.hasOwn(parsed, "torrentFilters")).toBe(false);
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

	test("maps legacy update channel names", () => {
		expect(parseAppSettings({ updateChannel: "rc" }).updateChannel).toBe("beta");
		expect(parseAppSettings({}).updateChannel).toBe("stable");
	});

	test("defaults missing uiZoom to 100", () => {
		expect(parseAppSettings({}).uiZoom).toBe(100);
	});

	test("keeps a valid uiZoom percent", () => {
		expect(parseAppSettings({ uiZoom: 125 }).uiZoom).toBe(125);
	});

	test("falls back when uiZoom is out of range", () => {
		expect(parseAppSettings({ uiZoom: 200 }).uiZoom).toBe(100);
	});
});

describe("parseTorrentFiltersFile", () => {
	test("uses bundled defaults when empty", () => {
		expect(parseTorrentFiltersFile(null).filters).toEqual(defaultTorrentFilters());
		expect(parseTorrentFiltersFile(null).enabled).toBe(true);
	});

	test("keeps an explicit empty filter list", () => {
		expect(parseTorrentFiltersFile({ filters: [] }).filters).toEqual([]);
	});
});
