import { describe, expect, test } from "bun:test";
import { channelWantsPrerelease, parseGithubChangelog, preprocessReleaseNotes } from "./github-releases";

const stable = {
	tag_name: "v1.0.0",
	name: "1.0.0",
	body: "stable notes",
	prerelease: false,
	draft: false,
	html_url: "https://github.com/Venipa/biyori/releases/tag/v1.0.0",
	published_at: "2026-01-01T00:00:00Z",
};

const rc = {
	...stable,
	tag_name: "v1.1.0-rc.1",
	name: "1.1.0-rc.1",
	body: "rc notes",
	prerelease: true,
	html_url: "https://github.com/Venipa/biyori/releases/tag/v1.1.0-rc.1",
};

const draft = { ...rc, draft: true, tag_name: "v1.1.0-rc.2" };

describe("github changelog", () => {
	test("stable channel keeps published releases only", () => {
		const result = parseGithubChangelog([stable, rc, draft], "stable");
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.items.map((item) => item.tag_name)).toEqual(["v1.0.0"]);
	});

	test("rc channel keeps published prereleases only", () => {
		const result = parseGithubChangelog([stable, rc, draft], "rc");
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.items.map((item) => item.tag_name)).toEqual(["v1.1.0-rc.1"]);
	});

	test("rewrites GitHub full changelog URLs to markdown links", () => {
		const body = "### Fixes\n\n**Full Changelog**: https://github.com/Venipa/biyori/compare/v1.0.0...v1.1.0";
		expect(preprocessReleaseNotes(body)).toContain("[View on GitHub](https://github.com/Venipa/biyori/compare/v1.0.0...v1.1.0)");
	});

	test("github error objects are not treated as changelog", () => {
		const result = parseGithubChangelog({ message: "Not Found", documentation_url: "https://docs.github.com" }, "stable");
		expect(result).toEqual({ ok: false, error: "Could not load changelog" });
	});

	test("channelWantsPrerelease", () => {
		expect(channelWantsPrerelease("stable")).toBe(false);
		expect(channelWantsPrerelease("dev")).toBe(false);
		expect(channelWantsPrerelease("rc")).toBe(true);
		expect(channelWantsPrerelease("canary")).toBe(true);
	});
});
