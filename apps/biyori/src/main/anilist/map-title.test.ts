import { describe, expect, test } from "bun:test";
import { parseStoredTitles, stringifyMediaTitles } from "../../lib/anime-titles";
import { displayTitleFromRow, pickTitle } from "./map";

const titles = {
	romaji: "Kimetsu no Yaiba",
	english: "Demon Slayer",
	native: "鬼滅の刃",
	userPreferred: "Demon Slayer",
};

describe("pickTitle", () => {
	test("uses the named format instead of AniList userPreferred", () => {
		expect(pickTitle(titles, "Romaji")).toBe("Kimetsu no Yaiba");
		expect(pickTitle(titles, "English")).toBe("Demon Slayer");
		expect(pickTitle(titles, "Native")).toBe("鬼滅の刃");
	});

	test("falls back when a format is missing", () => {
		expect(pickTitle({ romaji: "", english: "", native: "鬼滅の刃", userPreferred: "Demon Slayer" }, "Romaji")).toBe("Demon Slayer");
		expect(pickTitle({ romaji: "Kimetsu no Yaiba", english: "", native: "" }, "English")).toBe("Kimetsu no Yaiba");
	});
});

describe("stored titles", () => {
	test("round-trips language variants and synonyms", () => {
		const stored = stringifyMediaTitles(titles, ["Blade of Demon Destruction"]);
		expect(parseStoredTitles(stored)).toEqual({
			romaji: "Kimetsu no Yaiba",
			english: "Demon Slayer",
			native: "鬼滅の刃",
			synonyms: ["Blade of Demon Destruction"],
		});
		expect(displayTitleFromRow("Kimetsu no Yaiba", stored, "English")).toBe("Demon Slayer");
	});

	test("treats empty json as missing", () => {
		expect(parseStoredTitles("{}")).toBeNull();
		expect(displayTitleFromRow("Kimetsu no Yaiba", "{}", "English")).toBe("Kimetsu no Yaiba");
	});
});
