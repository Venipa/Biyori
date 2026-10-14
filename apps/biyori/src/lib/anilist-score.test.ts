import { describe, expect, test } from "bun:test";
import { DEFAULT_SCORE_FORMAT, displayToRaw, formatScore, parseScoreFormat, rawToDisplay, scoreScale } from "./anilist-score";

describe("parseScoreFormat", () => {
	test("keeps known formats", () => {
		expect(parseScoreFormat("POINT_10_DECIMAL")).toBe("POINT_10_DECIMAL");
		expect(parseScoreFormat("POINT_5")).toBe("POINT_5");
	});

	test("maps unknown and 3-point to 100", () => {
		expect(parseScoreFormat("POINT_3")).toBe(DEFAULT_SCORE_FORMAT);
		expect(parseScoreFormat(null)).toBe(DEFAULT_SCORE_FORMAT);
	});
});

describe("score conversion", () => {
	test("roundtrips 100-point", () => {
		expect(rawToDisplay(85, "POINT_100")).toBe(85);
		expect(displayToRaw(85, "POINT_100")).toBe(85);
		expect(formatScore(85, "POINT_100")).toBe("85");
	});

	test("roundtrips 10-point decimal", () => {
		expect(rawToDisplay(85, "POINT_10_DECIMAL")).toBe(8.5);
		expect(displayToRaw(8.5, "POINT_10_DECIMAL")).toBe(85);
		expect(formatScore(85, "POINT_10_DECIMAL")).toBe("8.5");
		expect(formatScore(80, "POINT_10_DECIMAL")).toBe("8");
	});

	test("roundtrips 10-point", () => {
		expect(rawToDisplay(80, "POINT_10")).toBe(8);
		expect(displayToRaw(8, "POINT_10")).toBe(80);
		expect(formatScore(80, "POINT_10")).toBe("8");
	});

	test("roundtrips 5-star", () => {
		expect(rawToDisplay(80, "POINT_5")).toBe(4);
		expect(displayToRaw(4, "POINT_5")).toBe(80);
		expect(formatScore(80, "POINT_5")).toBe("4/5");
	});

	test("clears empty scores", () => {
		expect(rawToDisplay(null, "POINT_100")).toBe(0);
		expect(displayToRaw(0, "POINT_10")).toBeNull();
		expect(formatScore(null, "POINT_5")).toBe("-");
	});

	test("scales match format", () => {
		expect(scoreScale("POINT_100")).toEqual({ max: 100, step: 1 });
		expect(scoreScale("POINT_10_DECIMAL")).toEqual({ max: 10, step: 0.1 });
		expect(scoreScale("POINT_5")).toEqual({ max: 5, step: 1 });
	});
});
