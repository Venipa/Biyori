import { describe, expect, test } from "bun:test";
import { splashSegmentState } from "./splash-progress";

describe("splashSegmentState", () => {
	test("walk phase uses the first of two bars", () => {
		expect(
			splashSegmentState({
				bootBody: "0/2",
				scanTitle: "Checking folders",
				scanBody: "12 files",
			}),
		).toEqual({ completed: 0, total: 2, inner: null });
	});

	test("match phase fills the first bar and puts ratio on the second", () => {
		expect(
			splashSegmentState({
				bootBody: "0/2",
				scanTitle: "Matching titles",
				scanBody: "3/10 matched",
			}),
		).toEqual({ completed: 1, total: 2, inner: 30 });
	});

	test("ready fills both bars", () => {
		expect(splashSegmentState({ bootBody: "2/2" })).toEqual({ completed: 2, total: 2, inner: null });
	});

	test("no library check is a single bar", () => {
		expect(splashSegmentState({})).toEqual({ completed: 0, total: 1, inner: null });
	});

	test("scan without startup still uses two bars", () => {
		expect(
			splashSegmentState({
				scanTitle: "Checking folders",
				scanBody: "12 files",
			}),
		).toEqual({ completed: 0, total: 2, inner: null });
	});
});
