import { describe, expect, test } from "bun:test";
import { getVersionChannel, isVersionAllowedOnChannel, parseUpdateChannel } from "./updater";

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

	test("maps legacy rc/canary to beta", () => {
		expect(parseUpdateChannel("rc")).toBe("beta");
		expect(parseUpdateChannel("canary")).toBe("beta");
		expect(parseUpdateChannel("alpha")).toBe("alpha");
		expect(parseUpdateChannel("nope")).toBe("stable");
	});
});
