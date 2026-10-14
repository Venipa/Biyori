export const UI_LOCALE_IDS = ["en", "de", "ja", "ko", "zh-Hans", "zh-Hant", "pt", "es", "pl", "ru"] as const;

export type UiLocale = (typeof UI_LOCALE_IDS)[number];

export const UI_LOCALES = [
	{ id: "en", nativeLabel: "English", ready: true },
	{ id: "de", nativeLabel: "Deutsch", ready: false },
	{ id: "ja", nativeLabel: "日本語", ready: false },
	{ id: "ko", nativeLabel: "한국어", ready: false },
	{ id: "zh-Hans", nativeLabel: "简体中文", ready: false },
	{ id: "zh-Hant", nativeLabel: "繁體中文", ready: false },
	{ id: "pt", nativeLabel: "Português", ready: false },
	{ id: "es", nativeLabel: "Español", ready: false },
	{ id: "pl", nativeLabel: "Polski", ready: false },
	{ id: "ru", nativeLabel: "Русский", ready: false },
] as const satisfies readonly { id: UiLocale; nativeLabel: string; ready: boolean }[];

export function parseUiLocale(value: unknown): UiLocale {
	if (typeof value === "string" && (UI_LOCALE_IDS as readonly string[]).includes(value)) {
		return value as UiLocale;
	}
	return "en";
}
