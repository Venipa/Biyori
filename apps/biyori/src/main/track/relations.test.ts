import { describe, expect, test } from "bun:test";
import { redirectIfOutOfRange, uniqueOutOfRangeRedirect } from "@biyori/recognition";
import { parseRelations } from "./relations";

const TYBW = `- 41467|43078|116674:41-50 -> 60636|49444|185874:1-10!
`;

describe("parseRelations", () => {
	test("duplicates a ! rule onto the destination id", () => {
		const rules = parseRelations(TYBW);
		expect(rules).toEqual([
			{
				fromId: 116674,
				fromStart: 41,
				fromEnd: 50,
				toId: 185874,
				toStart: 1,
			},
			{
				fromId: 185874,
				fromStart: 41,
				fromEnd: 50,
				toId: 185874,
				toStart: 1,
			},
		]);
	});

	test("maps TYBW 47 to Calamity 7 from part 1", () => {
		const rules = parseRelations(TYBW);
		expect(redirectIfOutOfRange({ id: 116674, episodes: 13 }, 47, rules)).toEqual({
			id: 185874,
			episode: 7,
		});
	});

	test("maps TYBW 47 to Calamity 7 when the cour was already picked", () => {
		const rules = parseRelations(TYBW);
		expect(redirectIfOutOfRange({ id: 185874, episodes: 10 }, 47, rules)).toEqual({
			id: 185874,
			episode: 7,
		});
	});

	test("keeps an in-range Calamity episode", () => {
		const rules = parseRelations(TYBW);
		expect(redirectIfOutOfRange({ id: 185874, episodes: 10 }, 5, rules)).toEqual({
			id: 185874,
			episode: 5,
		});
	});

	test("hops S17E47 to Calamity when title match never lands on a cour", () => {
		const rules = parseRelations(TYBW);
		expect(
			uniqueOutOfRangeRedirect(
				47,
				[
					{ id: 269, episodes: 366 },
					{ id: 116674, episodes: 13 },
					{ id: 185874, episodes: 10 },
				],
				rules,
			),
		).toEqual({ id: 185874, episode: 7 });
	});
});
