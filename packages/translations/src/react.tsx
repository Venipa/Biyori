/// <reference path="./yaml.d.ts" />
/// <reference path="./i18next.d.ts" />
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import en from "../locales/en.yml";

void i18n.use(initReactI18next).init({
	lng: "en",
	resources: { en: { translation: en } },
	interpolation: { escapeValue: false },
});

export { useTranslation };
