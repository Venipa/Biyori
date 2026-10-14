/// <reference path="./yaml.d.ts" />
/// <reference path="./i18next.d.ts" />
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import en from "../locales/en.yml";

void i18n.use(initReactI18next).init({
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

export { t, useTranslation };
