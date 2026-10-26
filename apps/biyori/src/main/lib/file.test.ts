import { describe, expect, test } from "bun:test";
import { safeFileStem } from "./file";

describe("file helpers", () => {
	test("strips reserved filename characters", () => {
		expect(safeFileStem("Foo: Bar/Baz?.webp", "poster")).toBe("Foo_ Bar_Baz_.webp");
		expect(safeFileStem("   ", "poster")).toBe("poster");
	});
});
