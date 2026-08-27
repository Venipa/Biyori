import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type ZodType, z } from "zod";

const YAML_LANGUAGE_SERVER_COMMENT = /^# yaml-language-server: \$schema=.+\r?\n/;

export function jsonSchemaFromZod(schema: ZodType): Record<string, unknown> {
	return z.toJSONSchema(schema, {
		target: "draft-7",
		unrepresentable: "any",
	}) as Record<string, unknown>;
}

export function storeJsonSchemaFileName(storeName: string): string {
	return `${storeName}.schema.json`;
}

export function yamlLanguageServerHref(schemaFileName: string): string {
	return `./${schemaFileName.replaceAll("\\", "/")}`;
}

export function withYamlLanguageServerSchema(yaml: string, schemaHref: string): string {
	const comment = `# yaml-language-server: $schema=${schemaHref}\n`;
	return `${comment}${yaml.replace(YAML_LANGUAGE_SERVER_COMMENT, "")}`;
}

export function writeStoreJsonSchema(dir: string, storeName: string, jsonSchema: Record<string, unknown>): string {
	const fileName = storeJsonSchemaFileName(storeName);
	writeFileSync(path.join(dir, fileName), `${JSON.stringify(jsonSchema, null, "\t")}\n`);
	return fileName;
}

export function linkYmlStoreSchema(dir: string, storeName: string, schema: ZodType): string {
	const fileName = writeStoreJsonSchema(dir, storeName, jsonSchemaFromZod(schema));
	return yamlLanguageServerHref(fileName);
}

export function ensureYamlSchemaComment(filePath: string, schemaHref: string): void {
	if (!existsSync(filePath)) {
		return;
	}
	const raw = readFileSync(filePath, "utf8");
	if (raw.startsWith(`# yaml-language-server: $schema=${schemaHref}\n`)) {
		return;
	}
	writeFileSync(filePath, withYamlLanguageServerSchema(raw, schemaHref));
}
