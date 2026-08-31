import { describe, expect, test } from "bun:test";
import { clampRectToWorkArea } from "./work-area";

describe("clampRectToWorkArea", () => {
	const workArea = { x: 100, y: 50, width: 800, height: 600 };

	test("keeps a window that already fits", () => {
		expect(clampRectToWorkArea({ x: 120, y: 80, width: 400, height: 300 }, workArea)).toEqual({
			x: 120,
			y: 80,
			width: 400,
			height: 300,
		});
	});

	test("shrinks and shifts a window that overflows the work area", () => {
		expect(clampRectToWorkArea({ x: 50, y: 10, width: 2000, height: 2000 }, workArea)).toEqual({
			x: 100,
			y: 50,
			width: 800,
			height: 600,
		});
	});
});
