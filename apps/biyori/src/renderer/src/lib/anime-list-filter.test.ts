import { describe, expect, test } from "bun:test";
import { animeMatchesListFilter, appendFilterClauses, parseFilterQuery, serializeFilterQuery } from "./anime-list-filter";

const row = {
	title: "Frieren",
	genres: '["Adventure","Fantasy"]',
	tags: '["Isekai","Magic"]',
	score: 90,
	popularity: 20000,
	type: "TV",
	season: "Fall 2023",
	id: 154587,
	episodes: 28,
};

describe("animeMatchesListFilter", () => {
	test("score greater than", () => {
		expect(animeMatchesListFilter(row, "score:>30")).toBe(true);
		expect(animeMatchesListFilter(row, "score:>95")).toBe(false);
	});

	test("popular is true/false from all-time rank", () => {
		expect(animeMatchesListFilter({ ...row, popularRank: 12 }, "popular:true")).toBe(true);
		expect(animeMatchesListFilter({ ...row, popularRank: 12 }, "popular:false")).toBe(false);
		expect(animeMatchesListFilter({ ...row, popularRank: null }, "popular:true")).toBe(false);
		expect(animeMatchesListFilter({ ...row, popularRank: null }, "popular:false")).toBe(true);
		expect(animeMatchesListFilter({ ...row, popularRank: 1 }, "popularity:yes")).toBe(true);
	});

	test("genre comma is AND and pipe is OR", () => {
		expect(animeMatchesListFilter(row, "genre:Adventure,Fantasy")).toBe(true);
		expect(animeMatchesListFilter(row, "genre:Adventure,Comedy")).toBe(false);
		expect(animeMatchesListFilter(row, "genre:Comedy|Fantasy")).toBe(true);
		expect(animeMatchesListFilter(row, "genres:Adventure,Comedy|Fantasy")).toBe(true);
	});

	test("tags aliases and combinators", () => {
		expect(animeMatchesListFilter(row, "tags:isekai,magic")).toBe(true);
		expect(animeMatchesListFilter(row, "tag:isekai|mecha")).toBe(true);
		expect(animeMatchesListFilter(row, "tags:mecha")).toBe(false);
	});

	test("type pipe is OR", () => {
		expect(animeMatchesListFilter(row, "type:TV")).toBe(true);
		expect(animeMatchesListFilter(row, "type:Movie")).toBe(false);
		expect(animeMatchesListFilter(row, "type:TV|Movie")).toBe(true);
	});

	test("unknown prefix stays literal title search", () => {
		expect(animeMatchesListFilter({ title: "foo bar" }, "foo:bar")).toBe(false);
		expect(animeMatchesListFilter({ title: "foo:bar" }, "foo:bar")).toBe(true);
	});
});

describe("parseFilterQuery / serializeFilterQuery", () => {
	test("round-trips chips and free text", () => {
		const parsed = parseFilterQuery("score:>30 genre:Action,Comedy frieren");
		expect(parsed.freeText).toBe("frieren");
		expect(parsed.clauses).toEqual([
			{ field: "score", op: "gt", value: "30" },
			{ field: "genre", op: "eq", value: "Action,Comedy" },
		]);
		expect(serializeFilterQuery(parsed)).toBe("score:>30 genre:Action,Comedy frieren");
	});

	test("keeps first clause per field", () => {
		expect(parseFilterQuery("genre:Action genre:Comedy tags:Isekai").clauses).toEqual([
			{ field: "genre", op: "eq", value: "Action" },
			{ field: "tags", op: "eq", value: "Isekai" },
		]);
	});

	test("tags alias canonicalizes on serialize", () => {
		expect(serializeFilterQuery(parseFilterQuery("tag:isekai"))).toBe("tags:isekai");
		expect(serializeFilterQuery(parseFilterQuery("popularity:true"))).toBe("popular:true");
	});

	test("appendFilterClauses keeps first pill per field", () => {
		expect(
			appendFilterClauses(
				[{ field: "genre", op: "eq", value: "Action" }],
				[
					{ field: "genre", op: "eq", value: "Comedy" },
					{ field: "tags", op: "eq", value: "Isekai" },
				],
			),
		).toEqual([
			{ field: "genre", op: "eq", value: "Action" },
			{ field: "tags", op: "eq", value: "Isekai" },
		]);
	});
});
