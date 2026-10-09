import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { yamlPlugin } from "vite-yaml-plugin";

const localeYml = /[/\\]translations[/\\]locales[/\\][^/\\]+\.yml$/i;
const enFile = fileURLToPath(new URL("../locales/en.yml", import.meta.url));
const typesFile = fileURLToPath(new URL("./i18next.d.ts", import.meta.url));

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function renderType(value: unknown, indent: string): string {
	if (!isRecord(value)) {
		return "string";
	}
	const fields = Object.entries(value).map(([key, child]) => {
		const name = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
		return `${indent}\t${name}: ${renderType(child, `${indent}\t`)};`;
	});
	return `{\n${fields.join("\n")}\n${indent}}`;
}

export function localeTypeDeclaration(): string {
	const catalog = load(readFileSync(enFile, "utf8"));
	return `import "i18next";\n\ndeclare module "i18next" {\n\tinterface CustomTypeOptions {\n\t\tresources: {\n\t\t\ttranslation: ${renderType(catalog, "\t\t\t")};\n\t\t};\n\t}\n}\n`;
}

function syncLocaleTypes(): void {
	const next = localeTypeDeclaration();
	if (existsSync(typesFile) && readFileSync(typesFile, "utf8") === next) {
		return;
	}
	writeFileSync(typesFile, next);
}

export function translationsYaml() {
	return [
		yamlPlugin({ match: localeYml }),
		{
			name: "biyori-translations-types",
			buildStart() {
				this.addWatchFile(enFile);
				syncLocaleTypes();
			},
			watchChange(id: string) {
				if (id.replaceAll("\\", "/").endsWith("/locales/en.yml")) {
					syncLocaleTypes();
				}
			},
		},
	];
}
