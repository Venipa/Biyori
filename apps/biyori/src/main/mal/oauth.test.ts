import { describe, expect, mock, test } from "bun:test";

mock.module("electron", () => ({ shell: { openExternal: () => Promise.resolve() } }));
const { parseMalDeepLink } = await import("./oauth");

describe("parseMalDeepLink", () => {
	test("ignores other links", () => {
		expect(parseMalDeepLink("biyori://anilist/callback?code=x")).toBeNull();
	});

	test("reports denial and unknown state", () => {
		expect(parseMalDeepLink("biyori://mal/callback?error=access_denied")).toEqual({ error: "access_denied" });
		expect(parseMalDeepLink("biyori://mal/callback?code=abc&state=nope")).toHaveProperty("error");
	});
});
