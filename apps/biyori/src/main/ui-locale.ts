import { setUiLocale } from "@biyori/translations/i18n";
import { loadAppSettings, subscribeSettings } from "./settings";

export function startUiLocaleSync(): void {
	setUiLocale(loadAppSettings().uiLocale);
	subscribeSettings((settings) => {
		setUiLocale(settings.uiLocale);
	});
}
