/// <reference path="./yaml.d.ts" />
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import en from "../locales/en.yaml";

void i18n.use(initReactI18next).init({
	lng: "en",
	resources: { en: { translation: en } },
	interpolation: { escapeValue: false },
});

export { useTranslation };
