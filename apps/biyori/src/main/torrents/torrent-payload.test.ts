import { describe, expect, test } from "bun:test";
import { isTorrentPayload } from "./torrent-payload";

describe("torrent payload validation", () => {
	test("accepts a bencoded metainfo dictionary", () => {
		expect(isTorrentPayload(Buffer.from("d4:infod4:name4:testee"))).toBe(true);
	});

	test("rejects an HTML error page", () => {
		expect(isTorrentPayload(Buffer.from("<html>not found</html>"))).toBe(false);
	});
});
