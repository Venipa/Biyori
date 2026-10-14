import i18n from "i18next";
import en from "../locales/en.yml";

void i18n.init({
	lng: "en",
	fallbackLng: "en",
	resources: { en: { translation: en } },
	interpolation: { escapeValue: false },
});

export function setUiLocale(locale: string): void {
	if (i18n.language !== locale) {
		void i18n.changeLanguage(locale);
	}
}

const t = i18n.t.bind(i18n);

export { i18n, t };
