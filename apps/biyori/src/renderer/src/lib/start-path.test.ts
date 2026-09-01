import { describe, expect, test } from "bun:test";
import { resolveRendererRoutePath } from "./start-path";

describe("resolveRendererRoutePath", () => {
	test("hash wins over query to", () => {
		expect(resolveRendererRoutePath({ hash: "#/settings/services", to: "/update", start: "/app/about" })).toBe("/settings/services");
	});

	test("uses to then default when hash is empty", () => {
		expect(resolveRendererRoutePath({ hash: "", to: "/settings/services", start: undefined })).toBe("/settings/services");
		expect(resolveRendererRoutePath({ hash: "", to: null, start: undefined })).toBe("/app/anime-list");
	});
});
