import { describe, expect, test } from "bun:test";
import { channelWantsPrerelease } from "../shared/updater";
import { parseGithubChangelog, preprocessReleaseNotes, sanitizeUpdateError } from "./github-releases";

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

const alpha = {
	...stable,
	tag_name: "v1.2.0-a.1",
	name: "1.2.0-a.1",
	body: "alpha notes",
	prerelease: true,
	html_url: "https://github.com/Venipa/biyori/releases/tag/v1.2.0-a.1",
};

const draft = { ...rc, draft: true, tag_name: "v1.1.0-rc.2" };

describe("github changelog", () => {
	test("stable channel keeps published releases only", () => {
		const result = parseGithubChangelog([stable, rc, alpha, draft], "stable");
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.items.map((item) => item.version)).toEqual(["1.0.0"]);
	});

	test("beta channel includes rc and stable, not alpha", () => {
		const result = parseGithubChangelog([stable, rc, alpha, draft], "beta");
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.items.map((item) => item.version)).toEqual(["1.1.0-rc.1", "1.0.0"]);
	});

	test("alpha channel includes a, rc, and stable", () => {
		const result = parseGithubChangelog([stable, rc, alpha, draft], "alpha");
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.items.map((item) => item.version)).toEqual(["1.2.0-a.1", "1.1.0-rc.1", "1.0.0"]);
	});

	test("rewrites GitHub full changelog URLs to markdown links", () => {
		const body = "### Fixes\n\n**Full Changelog**: https://github.com/Venipa/biyori/compare/v1.0.0...v1.1.0";
		expect(preprocessReleaseNotes(body)).toContain("[View on GitHub](https://github.com/Venipa/biyori/compare/v1.0.0...v1.1.0)");
	});

	test("github error objects are not treated as changelog", () => {
		const result = parseGithubChangelog({ message: "Not Found", documentation_url: "https://docs.github.com" }, "stable");
		expect(result).toEqual({ ok: false, error: "Could not load changelog" });
	});

	test("strips http dumps from updater errors", () => {
		const dump = new Error(
			'Cannot parse releases feed: Error: Unable to find latest version on GitHub (https://github.com/Venipa/biyori/releases/latest), please ensure a production release exists: HttpError: 406 "method: GET url: https://github.com/Venipa/biyori/releases\\n\\n Data:\\n \\n " Headers: { "set-cookie": ["_gh_sess=secret"] } XML: <feed>',
		);
		expect(sanitizeUpdateError(dump)).toBe("No production GitHub release found for this channel");
		expect(sanitizeUpdateError(dump)).not.toMatch(/set-cookie|Headers|<feed>/i);
	});

	test("channelWantsPrerelease", () => {
		expect(channelWantsPrerelease("stable")).toBe(false);
		expect(channelWantsPrerelease("beta")).toBe(true);
		expect(channelWantsPrerelease("alpha")).toBe(true);
	});
});
