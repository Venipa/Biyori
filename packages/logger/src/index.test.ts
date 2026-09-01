import { describe, expect, test } from "bun:test";
import { formatLogArgs, LogLevel, logLevelLabel } from "./index";

describe("formatLogArgs", () => {
	test("joins strings", () => {
		expect(formatLogArgs(["hello", "world"])).toBe("hello world");
	});

	test("stringifies objects", () => {
		expect(formatLogArgs([{ a: 1 }])).toBe('{"a":1}');
	});

	test("keeps Error stack or message", () => {
		const err = new Error("boom");
		expect(formatLogArgs([err])).toContain("boom");
	});

	test("falls back when JSON.stringify throws", () => {
		const cyclic: { self?: unknown } = {};
		cyclic.self = cyclic;
		expect(formatLogArgs([cyclic])).toBe("[object Object]");
	});
});

describe("logLevelLabel", () => {
	test("maps known levels", () => {
		expect(logLevelLabel(LogLevel.Error)).toBe("error");
		expect(logLevelLabel(LogLevel.Warning)).toBe("warn");
	});
});
