import { describe, expect, test } from "bun:test";
import { relatedHistoryLabel } from "./related-media";

describe("relatedHistoryLabel", () => {
	test("prefers hop relation, else season", () => {
		expect(relatedHistoryLabel("SEQUEL", "Fall 2020")).toBe("Sequel");
		expect(relatedHistoryLabel(undefined, "Fall 2020")).toBe("Fall 2020");
		expect(relatedHistoryLabel("SOURCE", "")).toBe("Source");
	});
});
