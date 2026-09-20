import { describe, expect, test } from "bun:test";
import { isAllowedCoverUrl, isAllowedMediaUrl } from "./allowed-url";

describe("isAllowedMediaUrl", () => {
	test("allows anilist anime and manga covers", () => {
		expect(isAllowedCoverUrl("https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx21000-x.jpg")).toBe(true);
		expect(isAllowedCoverUrl("https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx105778-y.jpg")).toBe(true);
		expect(isAllowedCoverUrl("https://s4.anilist.co/file/anilistcdn/media/character/images/x.jpg")).toBe(false);
		expect(isAllowedMediaUrl("banner", "https://s4.anilist.co/file/anilistcdn/media/anime/banner/x.jpg")).toBe(true);
	});
});
