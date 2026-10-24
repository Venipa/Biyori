import { describe, expect, test } from "bun:test";
import type { RelatedMedia } from "../../lib/schemas/related-media";
import { tvPrequelSeasonIndex } from "./series-season";

function tv(id: number, prequelId?: number): { id: number; type: string; related: RelatedMedia[] } {
	const related: RelatedMedia[] = [];
	if (prequelId != null) {
		related.push({
			id: prequelId,
			mediaType: "ANIME",
			relationType: "PREQUEL",
			title: "prev",
			coverUrl: "",
			format: "TV",
			episodes: 12,
			chapters: null,
		});
	}
	return { id, type: "TV", related };
}

describe("tvPrequelSeasonIndex", () => {
	test("counts TV prequels on the list", () => {
		const listed = [tv(1), tv(2, 1), tv(3, 2), tv(4, 3)];
		expect(tvPrequelSeasonIndex(1, listed)).toBe(1);
		expect(tvPrequelSeasonIndex(4, listed)).toBe(4);
	});

	test("ignores a movie prequel", () => {
		const listed = [
			tv(1),
			{
				id: 4,
				type: "TV",
				related: [
					{
						id: 99,
						mediaType: "ANIME" as const,
						relationType: "PREQUEL",
						title: "movie",
						coverUrl: "",
						format: "Movie",
						episodes: 1,
						chapters: null,
					},
				],
			},
		];
		expect(tvPrequelSeasonIndex(4, listed)).toBe(1);
	});

	test("stops when the prequel is not listed", () => {
		expect(tvPrequelSeasonIndex(4, [tv(4, 3)])).toBe(1);
	});
});
