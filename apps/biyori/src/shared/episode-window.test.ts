import { describe, expect, test } from "bun:test";
import { EPISODE_AIR_GAP_MS, episodeInAirWindow, isMissingAiredEpisode } from "./episode-window";

const now = Date.parse("2026-09-25T12:00:00.000Z");

describe("episodeInAirWindow", () => {
	test("includes an episode that has already aired", () => {
		expect(episodeInAirWindow({ episodesWatched: 3, lastAiredEpisode: 4, nextAiringAt: null }, now)).toBe(true);
	});

	test("includes an early file when the next airing is within 7 days", () => {
		const nextAiringAt = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
		expect(episodeInAirWindow({ episodesWatched: 0, lastAiredEpisode: 0, nextAiringAt }, now)).toBe(true);
	});

	test("skips an airing more than 7 days away", () => {
		const nextAiringAt = new Date(now + EPISODE_AIR_GAP_MS + 60_000).toISOString();
		expect(episodeInAirWindow({ episodesWatched: 0, lastAiredEpisode: 0, nextAiringAt }, now)).toBe(false);
	});
});

describe("isMissingAiredEpisode", () => {
	test("skips a next episode that is already indexed", () => {
		expect(isMissingAiredEpisode({ episodesWatched: 3, lastAiredEpisode: 4, nextAiringAt: null, indexedEpisodes: [4] }, now)).toBe(false);
	});
});
