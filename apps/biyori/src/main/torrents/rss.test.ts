import { describe, expect, test } from "bun:test";
import { torrentInfoUrl } from "./rss";

describe("torrentInfoUrl", () => {
	test("uses the guid view page instead of the torrent file", () => {
		expect(
			torrentInfoUrl(
				"https://nyaa.si/view/12345",
				"https://nyaa.si/download/12345.torrent",
			),
		).toBe("https://nyaa.si/view/12345");
	});

	test("derives a nyaa view url from a download link", () => {
		expect(
			torrentInfoUrl(
				"12345",
				"https://nyaa.si/download/12345.torrent",
			),
		).toBe("https://nyaa.si/view/12345");
	});
});
