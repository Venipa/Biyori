import { describe, expect, test } from "bun:test";
import { jumpAnimeInfoFrame, pushAnimeInfoFrame, replaceAnimeInfoFrame, visibleAnimeInfoSheets } from "./anime-info-stack";

describe("anime info stack", () => {
	test("related push then jump restores previous", () => {
		const root = replaceAnimeInfoFrame({ id: 1, infoTab: "main" });
		const related = pushAnimeInfoFrame(root.stack, root.current, { id: 2, infoTab: "main" });
		expect(related.stack).toEqual([{ id: 1, infoTab: "main" }]);
		const back = jumpAnimeInfoFrame(related.stack, 0);
		expect(back.current).toEqual({ id: 1, infoTab: "main" });
		expect(back.stack).toEqual([]);
	});

	test("stamps leaving frame with from and hop relation", () => {
		const root = replaceAnimeInfoFrame({ id: 1, infoTab: "main" });
		const related = pushAnimeInfoFrame(root.stack, root.current, { id: 2, infoTab: "main", viaRelation: "SEQUEL" }, { title: "A", season: "Fall 2020" });
		expect(related.stack[0]).toMatchObject({ id: 1, title: "A", season: "Fall 2020", viaRelation: "SEQUEL" });
	});

	test("same id does not push", () => {
		const root = replaceAnimeInfoFrame({ id: 1, infoTab: "main" });
		const again = pushAnimeInfoFrame(root.stack, root.current, { id: 1, infoTab: "main" });
		expect(again.stack).toEqual([]);
	});

	test("visible sheets cap at 3 including current", () => {
		const current = { id: 9, infoTab: "main" as const };
		expect(visibleAnimeInfoSheets([], undefined)).toEqual([]);
		expect(visibleAnimeInfoSheets([], current)).toEqual([current]);
		expect(visibleAnimeInfoSheets([{ id: 1, infoTab: "main" }], current).map((frame) => frame.id)).toEqual([1, 9]);
		expect(
			visibleAnimeInfoSheets(
				[
					{ id: 1, infoTab: "main" },
					{ id: 2, infoTab: "main" },
				],
				current,
			).map((frame) => frame.id),
		).toEqual([1, 2, 9]);
		expect(
			visibleAnimeInfoSheets(
				[
					{ id: 1, infoTab: "main" },
					{ id: 2, infoTab: "main" },
					{ id: 3, infoTab: "main" },
					{ id: 4, infoTab: "main" },
				],
				current,
			).map((frame) => frame.id),
		).toEqual([3, 4, 9]);
	});
});
