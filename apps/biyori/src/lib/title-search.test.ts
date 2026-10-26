import { describe, expect, test } from "bun:test";
import { foldText, searchTitles, textIncludes } from "./title-search";

const pool = ["One Piece Film Red", "One Punch Man", "Jujutsu Kaisen", "Pokémon Horizons", "Re:Zero kara Hajimeru Isekai Seikatsu", "Kaguya-sama wa Kokurasetai"].map(
	(title, id) => ({ id, names: [title] }),
);

function top(query: string): string | undefined {
	return searchTitles(query, pool)[0]?.candidate.names[0];
}

describe("foldText", () => {
	test("strips accents and punctuation", () => {
		expect(foldText("Pokémon: Re-Zero!")).toBe("pokemon re zero");
	});
});

describe("textIncludes", () => {
	test("ignores accents, punctuation and spacing", () => {
		expect(textIncludes("Pokémon", "pokemon")).toBe(true);
		expect(textIncludes("Kaguya-sama", "kaguya sama")).toBe(true);
		expect(textIncludes("Re:Zero", "rezero")).toBe(true);
		expect(textIncludes("Jujutsu", "jujustu")).toBe(false);
	});
});

describe("searchTitles", () => {
	test("keeps short substring queries", () => {
		expect(searchTitles("one", pool).map((hit) => hit.candidate.id)).toEqual(expect.arrayContaining([0, 1]));
	});

	test("matches words in any order", () => {
		expect(top("kaisen jujutsu")).toBe("Jujutsu Kaisen");
	});

	test("ranks prefix above mid-title hits", () => {
		expect(top("ka")).toBe("Kaguya-sama wa Kokurasetai");
	});

	test("folds accents and punctuation", () => {
		expect(top("pokemon")).toBe("Pokémon Horizons");
		expect(top("rezero")).toBe("Re:Zero kara Hajimeru Isekai Seikatsu");
	});

	test("tolerates a typo", () => {
		expect(top("jujustu")).toBe("Jujutsu Kaisen");
	});

	test("returns nothing for garbage", () => {
		expect(searchTitles("zzzz", pool)).toEqual([]);
	});
});
