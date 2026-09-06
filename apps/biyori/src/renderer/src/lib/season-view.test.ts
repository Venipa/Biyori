import { describe, expect, test } from "bun:test";
import { flattenSeasonVirtualItems, seasonGridColumns } from "./season-view";

describe("seasonGridColumns", () => {
	test("matches image and tile breakpoints", () => {
		expect(seasonGridColumns("images", 400)).toBe(2);
		expect(seasonGridColumns("images", 640)).toBe(3);
		expect(seasonGridColumns("images", 1280)).toBe(6);
		expect(seasonGridColumns("tiles", 400)).toBe(1);
		expect(seasonGridColumns("tiles", 768)).toBe(2);
		expect(seasonGridColumns("tiles", 1280)).toBe(3);
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
