import { parse } from "yaml";

function localeYamlId(id: string): boolean {
	const clean = id.split("?")[0]?.replaceAll("\\", "/") ?? "";
	return clean.includes("/translations/locales/") && (clean.endsWith(".yaml") || clean.endsWith(".yml"));
}

export function translationsYaml() {
	return {
		name: "biyori-translations-yaml",
		enforce: "pre" as const,
		transform(code: string, id: string) {
			if (!localeYamlId(id)) {
				return;
			}
			return {
				code: `export default ${JSON.stringify(parse(code))}`,
				map: null,
			};
		},
	};
}
