import { describe, expect, test } from "bun:test";
import { chunk, posterColumns } from "./poster-wall";

describe("posterColumns", () => {
	test("fits tiles plus gaps", () => {
		expect(posterColumns(640, 112, 12)).toBe(5);
		expect(posterColumns(124, 112, 12)).toBe(1);
		expect(posterColumns(236, 112, 12)).toBe(2);
	});
	test("never drops below one column", () => {
		expect(posterColumns(50, 112, 12)).toBe(1);
		expect(posterColumns(0, 112, 12)).toBe(1);
	});
});

describe("chunk", () => {
	test("empty input has no rows", () => {
		expect(chunk([], 3)).toEqual([]);
	});
	test("keeps the partial last row", () => {
		expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
		expect(chunk([1, 2, 3, 4], 2)).toEqual([
			[1, 2],
			[3, 4],
		]);
	});
});
