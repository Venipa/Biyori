import { describe, expect, test } from "bun:test";
import { listStatusSchema, listStatusShortLabel } from "./list";

describe("listStatusShortLabel", () => {
	test("maps every AniList status to a short sidebar label", () => {
		expect(listStatusSchema.options.map(listStatusShortLabel)).toEqual(["Watching", "Completed", "On Hold", "Dropped", "Planned"]);
	});
});
