import { describe, expect, test } from "bun:test";
import { mediaImageUrl, parseMediaImageUrl } from "./media-url";

describe("media url", () => {
	test("round-trips kind, id and fallback src", () => {
		const src = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1-abc.png?x=1&y=2";
		expect(parseMediaImageUrl(mediaImageUrl("banner", 42, src))).toEqual({ kind: "banner", animeId: 42, src });
		expect(parseMediaImageUrl(mediaImageUrl("cover", 7))).toEqual({ kind: "cover", animeId: 7, src: undefined });
	});

	test("rejects foreign schemes, unknown kinds and non-numeric ids", () => {
		expect(parseMediaImageUrl("https://cover/1")).toBeNull();
		expect(parseMediaImageUrl("biyori-media://poster/1")).toBeNull();
		expect(parseMediaImageUrl("biyori-media://cover/../etc")).toBeNull();
		expect(parseMediaImageUrl("biyori-media://cover/1.5")).toBeNull();
		expect(parseMediaImageUrl("not a url")).toBeNull();
	});
});
