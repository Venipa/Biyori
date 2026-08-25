import { describe, expect, test } from "bun:test";
import { defaultTorrentFilters } from "../../lib/schemas/torrent-filter";
import {
	addDiscardAnimeFilter,
	applyArchiveFilter,
	applyTorrentFilters,
	compareTorrentState,
	evaluateCondition,
	setFansubFilter,
	type TorrentFilterItem,
	type TorrentFilterSubject,
} from "./filter";

function subject(partial: Partial<TorrentFilterSubject>): TorrentFilterSubject {
	return {
		title: "Show - 02 [1080p]",
		category: "Anime",
		description: "",
		link: "https://example.test/a",
		fileSizeBytes: 1_000_000_000,
		animeId: 1,
		animeTitle: "Show",
		dateStart: "",
		dateEnd: "",
		episodes: 12,
		airingStatus: "Currently airing",
		type: "TV",
		notes: "",
		userStatus: "Currently watching",
		episodeHigh: 2,
		episodeLow: 2,
		releaseVersion: 1,
		episodeAvailable: false,
		group: "Subs",
		videoResolution: "1080p",
		videoTerms: "",
		watched: 1,
		...partial,
	};
}

function item(
	id: string,
	partial: Partial<TorrentFilterSubject> = {},
): TorrentFilterItem {
	return {
		id,
		state: "blank",
		subject: subject(partial),
	};
}

describe("torrent filters", () => {
	test("empty numeric values do not match", () => {
		expect(
			evaluateCondition(
				{ element: "episode_number", op: "lte", value: "%watched%" },
				subject({ episodeHigh: 0, episodes: 0, watched: 3 }),
			),
		).toBe(false);
	});

	test("default presets select watching and deactivate not-in-list", () => {
		const watching = item("w");
		const unknown = item("u", { animeId: null, userStatus: "Not in list" });
		const dropped = item("d", { userStatus: "Dropped" });
		const watched = item("old", { episodeHigh: 1, watched: 1 });
		const rows = applyTorrentFilters(
			[watching, unknown, dropped, watched],
			defaultTorrentFilters(),
			true,
		);
		expect(rows.find((row) => row.id === "w")?.state).toBe("selected");
		expect(rows.find((row) => row.id === "u")?.state).toBe("discarded_inactive");
		expect(rows.find((row) => row.id === "d")?.state).toBe("discarded_normal");
		expect(rows.find((row) => row.id === "old")?.state).toBe("discarded_normal");
	});

	test("weak prefer discards lower-resolution siblings", () => {
		const hd = item("hd", { videoResolution: "1080p" });
		const sd = item("sd", { videoResolution: "720p" });
		applyTorrentFilters([hd, sd], defaultTorrentFilters(), true);
		expect(hd.state).toBe("selected");
		expect(sd.state).toBe("discarded_normal");
	});

	test("strong prefer discards other groups for one anime", () => {
		const filters = setFansubFilter([], 1, "Subs", "Show");
		const keep = item("keep", { group: "Subs" });
		const other = item("other", { group: "Other" });
		applyTorrentFilters([keep, other], filters, true);
		expect(keep.state).toBe("selected");
		expect(other.state).toBe("discarded_normal");
	});

	test("archive runs after other filters and discards by title", () => {
		const fresh = item("fresh");
		const old = item("old", { title: "Seen" });
		applyTorrentFilters([fresh, old], defaultTorrentFilters(), true);
		applyArchiveFilter([fresh, old], new Set(["Seen"]));
		expect(fresh.state).toBe("selected");
		expect(old.state).toBe("discarded_normal");
	});

	test("selected sorts before discarded", () => {
		expect(compareTorrentState("selected", "discarded_inactive")).toBeLessThan(
			0,
		);
		expect(compareTorrentState("blank", "discarded_normal")).toBeLessThan(0);
	});

	test("discard anime helper is idempotent", () => {
		const once = addDiscardAnimeFilter([], 9, "Title");
		const twice = addDiscardAnimeFilter(once, 9, "Title");
		expect(twice).toHaveLength(1);
	});
});
