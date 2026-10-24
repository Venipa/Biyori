import { describe, expect, test } from "bun:test";
import { formatElapsedSeconds } from "./format-duration";

describe("formatElapsedSeconds", () => {
	test("sub-second uses one decimal", () => {
		expect(formatElapsedSeconds(300)).toBe("0.3");
	});

	test("whole seconds stay integers", () => {
		expect(formatElapsedSeconds(5000)).toBe("5");
		expect(formatElapsedSeconds(90_000)).toBe("90");
	});
});
