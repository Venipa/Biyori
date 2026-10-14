import { describe, expect, test } from "bun:test";
import { imageExtFromMime, safeFileStem } from "./file";

describe("file helpers", () => {
	test("strips reserved filename characters", () => {
		expect(safeFileStem("Foo: Bar/Baz?.webp", "poster")).toBe("Foo_ Bar_Baz_.webp");
		expect(safeFileStem("   ", "poster")).toBe("poster");
	});

	test("maps image mime to extension", () => {
		expect(imageExtFromMime("image/png")).toBe("png");
		expect(imageExtFromMime("image/webp")).toBe("webp");
		expect(imageExtFromMime("image/jpeg")).toBe("jpg");
	});
});
