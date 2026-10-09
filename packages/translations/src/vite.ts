import { yamlPlugin } from "vite-yaml-plugin";

const localeYml = /[/\\]translations[/\\]locales[/\\][^/\\]+\.yml$/i;

export function translationsYaml() {
	return yamlPlugin({ match: localeYml });
}
