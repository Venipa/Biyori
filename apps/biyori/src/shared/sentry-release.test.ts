import { describe, expect, test } from "bun:test";
import { formatSentryRelease, sentryClientEnabled } from "./sentry-release";

describe("formatSentryRelease", () => {
	test("uses version when hash is missing", () => {
		expect(formatSentryRelease("1.2.3", undefined)).toBe("biyori@1.2.3");
		expect(formatSentryRelease("1.2.3", "")).toBe("biyori@1.2.3");
	});

	test("appends a short git hash", () => {
		expect(formatSentryRelease("1.2.3", "abcdef012345")).toBe("biyori@1.2.3+abcdef0");
	});
});

describe("sentryClientEnabled", () => {
	test("sends only from packaged builds with crash reports on", () => {
		expect(sentryClientEnabled(true, true)).toBe(true);
		expect(sentryClientEnabled(true, false)).toBe(false);
		expect(sentryClientEnabled(false, true)).toBe(false);
	});
});
