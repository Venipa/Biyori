import { describe, expect, test } from "bun:test";
import { formatTransferRate, getVersionChannel, isVersionAllowedOnChannel, parseUpdateChannel } from "./updater";

describe("update channels", () => {
	test("classifies semver prerelease ids", () => {
		expect(getVersionChannel("1.0.0")).toBe("stable");
		expect(getVersionChannel("v1.0.0-rc.1")).toBe("beta");
		expect(getVersionChannel("1.0.0-a.1")).toBe("alpha");
		expect(getVersionChannel("1.0.0-alpha.2")).toBe("alpha");
		expect(getVersionChannel("not-a-version")).toBe(null);
	});

	test("beta includes rc and stable, alpha includes all known channels", () => {
		expect(isVersionAllowedOnChannel("1.0.0", "stable")).toBe(true);
		expect(isVersionAllowedOnChannel("1.0.0-rc.1", "stable")).toBe(false);
		expect(isVersionAllowedOnChannel("1.0.0-rc.1", "beta")).toBe(true);
		expect(isVersionAllowedOnChannel("1.0.0", "beta")).toBe(true);
		expect(isVersionAllowedOnChannel("1.0.0-a.1", "beta")).toBe(false);
		expect(isVersionAllowedOnChannel("1.0.0-a.1", "alpha")).toBe(true);
		expect(isVersionAllowedOnChannel("1.0.0-rc.1", "alpha")).toBe(true);
	});

	test("formats download speed from bytes per second", () => {
		expect(formatTransferRate(0)).toBe("0 B/s");
		expect(formatTransferRate(512)).toBe("512 B/s");
		expect(formatTransferRate(1024)).toBe("1.0 KB/s");
		expect(formatTransferRate(1536)).toBe("1.5 KB/s");
		expect(formatTransferRate(1048576)).toBe("1.0 MB/s");
		expect(formatTransferRate(Number.NaN)).toBe("0 B/s");
	});

	test("maps legacy rc/canary to beta", () => {
		expect(parseUpdateChannel("rc")).toBe("beta");
		expect(parseUpdateChannel("canary")).toBe("beta");
		expect(parseUpdateChannel("alpha")).toBe("alpha");
		expect(parseUpdateChannel("nope")).toBe("stable");
	});
});
