import { describe, expect, test } from "bun:test";
import { parseColumnSizing } from "./table-column-sizing";

describe("parseColumnSizing", () => {
	test("keeps finite positive widths", () => {
		expect(parseColumnSizing({ title: 280, score: 72 })).toEqual({ title: 280, score: 72 });
	});

	test("drops invalid payloads", () => {
		expect(parseColumnSizing(null)).toEqual({});
		expect(parseColumnSizing({ title: 0 })).toEqual({});
		expect(parseColumnSizing({ title: "280" })).toEqual({});
	});
});
