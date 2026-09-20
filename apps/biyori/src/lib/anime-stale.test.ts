import { describe, expect, test } from "bun:test";
import { ANIME_STALE_MS, isAnimeStale } from "./anime-stale";

describe("isAnimeStale", () => {
	test("missing stamp is stale, fresh stamp is not", () => {
		expect(isAnimeStale(null)).toBe(true);
		expect(isAnimeStale(undefined)).toBe(true);
		expect(isAnimeStale(new Date(20_000).toISOString(), 20_000)).toBe(false);
		expect(isAnimeStale(new Date(0).toISOString(), ANIME_STALE_MS)).toBe(true);
	});
});
