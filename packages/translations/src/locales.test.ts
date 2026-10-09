import { describe, expect, test } from "bun:test";
import { translationsYaml } from "./vite";

describe("locale yml", () => {
	test("plugin inlines yml as a js module", () => {
		const transform = translationsYaml().transform;
		if (!transform || typeof transform === "function") {
			throw new Error("expected a filtered transform");
		}
		const transformed = transform.handler("hello: world\n", "/pkg/translations/locales/en.yml");
		if (!transformed || typeof transformed === "string") {
			throw new Error("expected a yml module");
		}
		expect(transformed.code).toBe(`export default {"hello":"world"};\n`);
	});

	test("leaves other files alone", () => {
		const transform = translationsYaml().transform;
		if (!transform || typeof transform === "function" || !(transform.filter.id instanceof RegExp)) {
			throw new Error("expected a path filter");
		}
		expect(transform.filter.id.test("/pkg/translations/locales/en.yml")).toBe(true);
		expect(transform.filter.id.test("/pkg/translations/src/react.tsx")).toBe(false);
		expect(transform.filter.id.test("/pkg/translations/locales/en.yaml")).toBe(false);
	});
});
