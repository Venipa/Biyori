import { describe, expect, test } from "bun:test";
import { buildAuthorizeUrl, parseAnilistDeepLink } from "./oauth-url";

describe("parseAnilistDeepLink", () => {
	test("reads access_token from the hash", () => {
		expect(parseAnilistDeepLink("biyori://anilist/callback#access_token=abc.def&token_type=Bearer&expires_in=31536000")).toBe("abc.def");
	});

	test("reads access_token from the query", () => {
		expect(parseAnilistDeepLink("biyori://anilist/callback?access_token=from-query")).toBe("from-query");
	});

	test("strips wrapping quotes from Windows argv", () => {
		expect(parseAnilistDeepLink('"biyori://anilist/callback#access_token=quoted"')).toBe("quoted");
	});

	test("ignores other hosts and paths", () => {
		expect(parseAnilistDeepLink("biyori://other/callback#access_token=nope")).toBeNull();
		expect(parseAnilistDeepLink("biyori://anilist/other#access_token=nope")).toBeNull();
		expect(parseAnilistDeepLink("https://anilist.co/api/v2/oauth/pin#access_token=nope")).toBeNull();
	});

	test("returns null without a token", () => {
		expect(parseAnilistDeepLink("biyori://anilist/callback")).toBeNull();
	});
});

describe("buildAuthorizeUrl", () => {
	test("uses implicit grant without redirect_uri", () => {
		const url = new URL(buildAuthorizeUrl("123"));
		expect(url.searchParams.get("client_id")).toBe("123");
		expect(url.searchParams.get("response_type")).toBe("token");
		expect(url.searchParams.has("redirect_uri")).toBe(false);
	});
});
