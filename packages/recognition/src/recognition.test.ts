import { describe, expect, test } from "bun:test";
import { extendTitle } from "./extend-title";
import { matchParsed, matchTitle } from "./match";
import { recognizeFilename, recognizePath } from "./recognize";
import { redirectIfOutOfRange } from "./redirect";
import type { TitleCandidate, TitleParts } from "./types";

const s1: TitleCandidate = {
	id: 1,
	names: ["show"],
	episodes: 12,
	status: "Currently watching",
};
const s4: TitleCandidate = {
	id: 4,
	names: ["show season 4"],
	episodes: 13,
	status: "Plan to watch",
};

function parts(
	title: string,
	season: number | null = null,
	year: number | null = null,
): TitleParts {
	return { title, season, year };
}

describe("extendTitle", () => {
	test("appends Season N when season is greater than 1", () => {
		expect(extendTitle(parts("Show", 4))).toBe("Show Season 4");
	});

	test("leaves season 1 titles unchanged", () => {
		expect(extendTitle(parts("Show", 1))).toBe("Show");
	});

	test("appends year", () => {
		expect(extendTitle(parts("Show", null, 2013))).toBe("Show (2013)");
	});
});

describe("matchParsed", () => {
	test("S4E8 matches season 4, not the watching season 1 entry", () => {
		expect(matchParsed(parts("Show", 4), [s1, s4])?.id).toBe(4);
	});

	test("S1E8 still matches season 1", () => {
		expect(matchParsed(parts("Show"), [s1, s4])?.id).toBe(1);
	});

	test("a title with no season still matches", () => {
		expect(matchTitle("Show", [s1, s4])?.id).toBe(1);
	});
});

describe("recognizeFilename", () => {
	test("parses S4E8 and matches season 4", () => {
		const result = recognizeFilename("[Sub] Show S4E8.mkv", [s1, s4]);
		expect(result?.parsed.season).toBe(4);
		expect(result?.parsed.episode).toBe(8);
		expect(result?.title).toBe("Show Season 4");
		expect(result?.match?.id).toBe(4);
	});

	test("reads season from a parent folder", () => {
		const result = recognizePath("D:/Anime/Show/Season 4/08.mkv", [s1, s4]);
		expect(result?.parsed.episode).toBe(8);
		expect(result?.match?.id).toBe(4);
	});
});

describe("redirectIfOutOfRange", () => {
	const rules = [
		{
			fromId: 1,
			fromStart: 13,
			fromEnd: 24,
			toId: 2,
			toStart: 1,
		},
	];

	test("keeps S4E8 on the season match", () => {
		expect(redirectIfOutOfRange(s4, 8, rules)).toEqual({ id: 4, episode: 8 });
	});

	test("maps absolute episode 40 when it is past season 1", () => {
		expect(redirectIfOutOfRange(s1, 24, rules)).toEqual({ id: 2, episode: 12 });
	});

	test("does not redirect when episode count is unknown", () => {
		expect(redirectIfOutOfRange({ id: 1, episodes: 0 }, 40, rules)).toEqual({
			id: 1,
			episode: 40,
		});
	});
});
