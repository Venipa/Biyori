import { describe, expect, test } from "bun:test";
import { listStatusSchema } from "../../shared/list";
import { malAnimeNodeSchema, malListEntryRow, mapMalStatus, toMalAnimeRow, toMalCard, toMalStatus } from "./map";

describe("mal map", () => {
	test("status round-trips for every local status", () => {
		for (const status of listStatusSchema.options) {
			expect(mapMalStatus(toMalStatus(status))).toBe(status);
		}
	});

	test("list entry score moves to the 0-100 scale", () => {
		expect(malListEntryRow(1, { status: "watching", score: 8 }).score).toBe(80);
	});

	test("list entry row keeps full dates only and maps rewatch/score", () => {
		const row = malListEntryRow(7, {
			status: "completed",
			score: 0,
			num_episodes_watched: 12,
			is_rewatching: true,
			start_date: "2024-03",
			finish_date: "2024-04-02",
			comments: "ok",
			updated_at: "2024-04-02T10:00:00+00:00",
		});
		expect(row).toMatchObject({
			animeId: 7,
			status: "Completed",
			score: null,
			episodesWatched: 12,
			rewatching: 1,
			dateStarted: null,
			dateCompleted: "2024-04-02",
			notes: "ok",
			lastUpdated: "2024-04-02T10:00:00.000Z",
		});
	});
});

describe("mal anime node", () => {
	const node = malAnimeNodeSchema.parse({
		id: 52991,
		title: "Sousou no Frieren",
		main_picture: { medium: "m.jpg", large: "l.jpg" },
		alternative_titles: { synonyms: ["Frieren"], en: "Frieren: Beyond Journey's End", ja: "葬送のフリーレン" },
		mean: 9.31,
		rank: 1,
		popularity: 150,
		num_list_users: 900000,
		media_type: "tv",
		status: "finished_airing",
		genres: [{ name: "Adventure" }],
		num_episodes: 28,
		start_season: { year: 2023, season: "fall" },
		broadcast: { day_of_the_week: "friday", start_time: "23:00" },
		average_episode_duration: 1470,
		studios: [{ name: "Madhouse" }],
		nsfw: "white",
	});

	test("row normalizes score to 0-100 and keeps the broadcast slot", () => {
		expect(toMalAnimeRow(node, "English")).toMatchObject({
			id: 52991,
			title: "Frieren: Beyond Journey's End",
			type: "TV",
			averageScore: 93,
			durationMinutes: 25,
			season: "Fall 2023",
			airingStatus: "Finished airing",
			broadcast: "Friday 23:00 JST",
			nextAiringAt: null,
			bannerUrl: "",
			tags: "[]",
			coverUrl: "l.jpg",
		});
	});

	test("card uses the season enum shape", () => {
		expect(toMalCard(node)).toMatchObject({ season: "FALL", seasonYear: 2023, averageScore: 93, isAdult: false });
	});
});
