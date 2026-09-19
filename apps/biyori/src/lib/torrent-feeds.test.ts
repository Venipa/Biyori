import { describe, expect, test } from "bun:test";
import { fillTorrentSearchUrl, torrentSearchUrlForFeed } from "./torrent-feeds";

describe("torrentSearchUrlForFeed", () => {
	test("pairs nyaa release feed with nyaa search", () => {
		expect(torrentSearchUrlForFeed("https://nyaa.si/?page=rss&c=1_2&f=0")).toBe("https://nyaa.si/?page=rss&c=1_2&f=0&q=%title%");
		expect(torrentSearchUrlForFeed("https://subsplease.org/rss/?t&r=1080")).toBe("");
	});
});

describe("fillTorrentSearchUrl", () => {
	test("fills title placeholder or q when missing", () => {
		expect(fillTorrentSearchUrl("https://nyaa.si/?page=rss&q=%title%", "Foo Bar")).toBe("https://nyaa.si/?page=rss&q=Foo%20Bar");
		expect(fillTorrentSearchUrl("https://nyaa.si/?page=rss&c=1_2&f=0", "Foo Bar")).toBe("https://nyaa.si/?page=rss&c=1_2&f=0&q=Foo+Bar");
	});
});
