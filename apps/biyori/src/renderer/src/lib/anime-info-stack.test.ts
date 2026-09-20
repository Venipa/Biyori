import { describe, expect, test } from "bun:test";
import { jumpAnimeInfoFrame, pushAnimeInfoFrame, replaceAnimeInfoFrame } from "./anime-info-stack";

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
});
