import { describe, expect, test } from "bun:test";
import { parseReleaseMarkdown } from "./markdown-parser";

describe("parseReleaseMarkdown", () => {
	test("compiles github-style markdown", async () => {
		const Content = await parseReleaseMarkdown("- fix login\n\n[View on GitHub](https://github.com/Venipa/biyori/compare/v1...v2)");
		expect(typeof Content).toBe("function");
	});
});
