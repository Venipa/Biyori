import { app } from "electron";
import * as Sentry from "@sentry/electron/main";
import { formatSentryRelease, sentryClientEnabled } from "../shared/sentry-release";
import { readAnilistAuth } from "./anilist/store";
import { loadAppSettings, subscribeSettings } from "./settings";

function applySentryEnabled(sendCrashReports: boolean): void {
	const options = Sentry.getClient()?.getOptions();
	if (options) {
		options.enabled = sentryClientEnabled(app.isPackaged, sendCrashReports);
	}
}

function applySentryUser(userId: number | null | undefined): void {
	if (userId == null) {
		Sentry.setUser(null);
		return;
	}
	Sentry.setUser({ id: String(userId) });
}

Sentry.init({
	dsn: "https://bd338024abd3435281658e420a5bf8bc@sentry.venipa.net/1",
	enabled: sentryClientEnabled(app.isPackaged, loadAppSettings().sendCrashReports),
	environment: app.isPackaged ? "production" : "development",
	release: formatSentryRelease(app.getVersion(), import.meta.env.VITE_APP_GIT_HASH),
});

applySentryUser(readAnilistAuth()?.userId);
subscribeSettings((settings) => {
	applySentryEnabled(settings.sendCrashReports);
});
