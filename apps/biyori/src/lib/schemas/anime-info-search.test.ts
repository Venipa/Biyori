import { describe, expect, test } from "bun:test";
import {
	animeInfoSearchSchema,
	parseAnimeInfoId,
} from "./anime-info-search";

describe("anime info search params", () => {
	test("keeps id as the url string so hash history does not rewrite", () => {
		const parsed = animeInfoSearchSchema.parse({
			id: "21000",
			infoTab: "main",
			q: "Some Title",
		});
		expect(parsed.id).toBe("21000");
		expect(parseAnimeInfoId(parsed.id)).toBe(21000);
	});

	test("parseAnimeInfoId rejects junk", () => {
		expect(parseAnimeInfoId("nope")).toBeUndefined();
		expect(parseAnimeInfoId("")).toBeUndefined();
		expect(parseAnimeInfoId(undefined)).toBeUndefined();
	});

	test("does not invent missing keys (defaults rewrite the hash)", () => {
		expect(animeInfoSearchSchema.parse({}).id).toBeUndefined();
		expect(animeInfoSearchSchema.parse({}).infoTab).toBeUndefined();
	});
});
