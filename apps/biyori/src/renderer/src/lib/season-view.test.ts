import { describe, expect, test } from "bun:test";
import type { SeasonItem } from "@/lib/schemas/seasons";
import { airStamp, flattenSeasonVirtualItems, formatPopularityCompact, groupSeasonItems, seasonGridColumns } from "./season-view";

describe("seasonGridColumns", () => {
	test("fits fixed-width cards", () => {
		expect(seasonGridColumns("images", 400)).toBe(2);
		expect(seasonGridColumns("images", 640)).toBe(3);
		expect(seasonGridColumns("images", 1280)).toBe(7);
		expect(seasonGridColumns("tiles", 400)).toBe(1);
		expect(seasonGridColumns("tiles", 768)).toBe(1);
		expect(seasonGridColumns("tiles", 1280)).toBe(2);
		expect(seasonGridColumns("tiles", 900)).toBe(2);
		expect(seasonGridColumns("guide", 1400)).toBe(1);
	});
});

describe("airStamp", () => {
	test("splits a fuzzy date into a guide stub", () => {
		expect(airStamp("2026-09-05")).toEqual({ month: "SEP", day: "5" });
		expect(airStamp(null)).toBeNull();
		expect(airStamp("soon")).toBeNull();
	});
});

describe("formatPopularityCompact", () => {
	test("shortens large counts", () => {
		expect(formatPopularityCompact(0)).toBe("?");
		expect(formatPopularityCompact(840)).toBe("840");
		expect(formatPopularityCompact(1500)).toBe("1.5k");
		expect(formatPopularityCompact(12345)).toBe("12k");
	});
});

describe("groupSeasonItems", () => {
	test("groups release dates in calendar order", () => {
		const item = (id: number, startDate: string | null): SeasonItem => ({ id, startDate }) as SeasonItem;
		const groups = groupSeasonItems({
			items: [item(2, "2026-10-02"), item(1, "2026-09-05"), item(3, null), item(4, "2026-09-05")],
			groupBy: "date",
			inListIds: new Set(),
		});
		expect(groups.map((group) => ({ key: group.key, label: group.label, ids: group.items.map((entry) => entry.id) }))).toEqual([
			{ key: "2026-09-05", label: "Sep 5, 2026", ids: [1, 4] },
			{ key: "2026-10-02", label: "Oct 2, 2026", ids: [2] },
			{ key: "unknown", label: "Unknown", ids: [3] },
		]);
	});
});

describe("flattenSeasonVirtualItems", () => {
	test("emits a header then chunked rows", () => {
		const items = flattenSeasonVirtualItems(
			[
				{
					key: "airing",
					label: "Currently airing",
					items: [{ id: 1 }, { id: 2 }, { id: 3 }],
				},
			],
			2,
		);
		expect(items).toEqual([
			{ type: "header", key: "h-airing", label: "Currently airing", count: 3 },
			{ type: "row", key: "r-airing-0", items: [{ id: 1 }, { id: 2 }] },
			{ type: "row", key: "r-airing-2", items: [{ id: 3 }] },
		]);
	});
});
