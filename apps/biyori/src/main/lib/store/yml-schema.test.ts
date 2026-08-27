import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	ensureYamlSchemaComment,
	jsonSchemaFromZod,
	linkYmlStoreSchema,
	storeJsonSchemaFileName,
	withYamlLanguageServerSchema,
	yamlLanguageServerHref,
} from "./yml-schema";

describe("yml store schema", () => {
	test("names the sidecar after the store", () => {
		expect(storeJsonSchemaFileName("app")).toBe("app.schema.json");
		expect(yamlLanguageServerHref("app.schema.json")).toBe("./app.schema.json");
	});

	test("prefixes yaml and replaces an existing schema comment", () => {
		const first = withYamlLanguageServerSchema("foo: 1\n", "./app.schema.json");
		expect(first).toBe("# yaml-language-server: $schema=./app.schema.json\nfoo: 1\n");
		expect(withYamlLanguageServerSchema(first, "./other.schema.json")).toBe("# yaml-language-server: $schema=./other.schema.json\nfoo: 1\n");
	});

	test("writes json schema next to the store", () => {
		const dir = mkdtempSync(path.join(tmpdir(), "biyori-yml-schema-"));
		const schema = z.object({ titleLanguage: z.enum(["Romaji", "English", "Native"]) });
		const href = linkYmlStoreSchema(dir, "app", schema);
		expect(href).toBe("./app.schema.json");
		const written = JSON.parse(readFileSync(path.join(dir, "app.schema.json"), "utf8")) as {
			properties?: { titleLanguage?: { enum?: string[] } };
		};
		expect(written.properties?.titleLanguage?.enum).toEqual(["Romaji", "English", "Native"]);
	});

	test("stamps an existing yaml file once", () => {
		const dir = mkdtempSync(path.join(tmpdir(), "biyori-yml-schema-"));
		const filePath = path.join(dir, "app.yml");
		writeFileSync(filePath, "closeToTray: true\n");
		ensureYamlSchemaComment(filePath, "./app.schema.json");
		ensureYamlSchemaComment(filePath, "./app.schema.json");
		expect(readFileSync(filePath, "utf8")).toBe("# yaml-language-server: $schema=./app.schema.json\ncloseToTray: true\n");
	});

	test("emits object properties from a zod schema", () => {
		const json = jsonSchemaFromZod(z.object({ closeToTray: z.boolean() }));
		expect(json.type).toBe("object");
		expect(json.properties).toEqual({ closeToTray: { type: "boolean" } });
	});
});
