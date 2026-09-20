import { describe, expect, test } from "bun:test";
import { toRelatedMedia } from "./map";

describe("toRelatedMedia", () => {
	test("keeps anime and manga edges, skips character", () => {
		const items = toRelatedMedia({
			id: 1,
			title: { romaji: "Root" },
			relations: {
				edges: [
					{
						relationType: "SEQUEL",
						node: {
							id: 2,
							type: "ANIME",
							format: "OVA",
							title: { romaji: "Ova" },
							coverImage: { large: "https://img/ova" },
							episodes: 3,
						},
					},
					{
						relationType: "SOURCE",
						node: {
							id: 9,
							type: "MANGA",
							format: "MANGA",
							title: { romaji: "Book" },
							coverImage: { large: "https://img/manga" },
							chapters: 12,
						},
					},
					{
						relationType: "CHARACTER",
						node: { id: 8, type: "ANIME", title: { romaji: "Skip" } },
					},
				],
			},
		});
		expect(items).toEqual([
			{
				id: 2,
				mediaType: "ANIME",
				relationType: "SEQUEL",
				title: "Ova",
				coverUrl: "https://img/ova",
				format: "OVA",
				episodes: 3,
				chapters: null,
			},
			{
				id: 9,
				mediaType: "MANGA",
				relationType: "SOURCE",
				title: "Book",
				coverUrl: "https://img/manga",
				format: "Manga",
				episodes: 0,
				chapters: 12,
			},
		]);
	});
});
