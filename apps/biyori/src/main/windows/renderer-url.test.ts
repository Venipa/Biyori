import { describe, expect, test } from "bun:test";
import { isAllowedRendererUrl, isHttpUrl } from "./renderer-url";

describe("isAllowedRendererUrl", () => {
	test("allows the vite origin in dev", () => {
		expect(isAllowedRendererUrl("http://localhost:5173/#/app/anime-list", "http://localhost:5173")).toBe(true);
	});

	test("rejects a library folder file url in dev", () => {
		expect(isAllowedRendererUrl("file:///E:/Anime/Show", "http://localhost:5173")).toBe(false);
	});

	test("rejects an external site in dev", () => {
		expect(isAllowedRendererUrl("https://anilist.co/anime/1", "http://localhost:5173")).toBe(false);
	});

	test("allows the packaged index.html", () => {
		expect(isAllowedRendererUrl("file:///E:/Biyori/renderer/index.html#/app/anime-list")).toBe(true);
	});

	test("rejects a folder file url in production", () => {
		expect(isAllowedRendererUrl("file:///E:/Anime/Show")).toBe(false);
	});
});

describe("isHttpUrl", () => {
	test("accepts http(s)", () => {
		expect(isHttpUrl("https://anilist.co/anime/1")).toBe(true);
	});

	test("rejects file urls", () => {
		expect(isHttpUrl("file:///E:/Anime/Show")).toBe(false);
	});
});
