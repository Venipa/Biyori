import { describe, expect, test } from "bun:test";
import { shouldBumpListRevision } from "./list-revision";

describe("shouldBumpListRevision", () => {
	test("bumps immediately then at most once per second", () => {
		expect(shouldBumpListRevision(0, 10_000)).toBe(true);
		expect(shouldBumpListRevision(10_000, 10_999)).toBe(false);
		expect(shouldBumpListRevision(10_000, 11_000)).toBe(true);
	});
});
