import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { localeTypeDeclaration, translationsYaml } from "./vite";

function yamlTransform() {
	const transform = translationsYaml().find((item) => item.name === "vite-yaml-plugin")?.transform;
	if (!transform || typeof transform === "function") {
		throw new Error("expected vite-yaml-plugin");
	}
	return transform;
}

describe("locale yml", () => {
	test("plugin inlines yml as a js module", () => {
		const transform = yamlTransform();
		const transformed = transform.handler("hello: world\n", "/pkg/translations/locales/en.yml");
		if (!transformed || typeof transformed === "string") {
			throw new Error("expected a yml module");
		}
		expect(transformed.code).toBe(`export default {"hello":"world"};\n`);
	});

	test("leaves other files alone", () => {
		const transform = yamlTransform();
		if (!(transform.filter.id instanceof RegExp)) {
			throw new Error("expected a path filter");
		}
		expect(transform.filter.id.test("/pkg/translations/locales/en.yml")).toBe(true);
		expect(transform.filter.id.test("/pkg/translations/src/react.tsx")).toBe(false);
		expect(transform.filter.id.test("/pkg/translations/locales/en.yaml")).toBe(false);
	});

	test("committed declaration matches en.yml", () => {
		const committed = readFileSync(fileURLToPath(new URL("./i18next.d.ts", import.meta.url)), "utf8");
		expect(committed).toBe(localeTypeDeclaration());
		expect(committed).toContain("continueWatching: string;");
		expect(committed).toContain("olderThan_one: string;");
	});
});
