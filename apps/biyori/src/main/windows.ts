import { t } from "@biyori/translations/i18n";
import { WindowManager } from "./windows/manager";

export const windowManager = new WindowManager({
	main: {
		title: t("shell.biyori"),
		width: 1200,
		height: 960,
		minWidth: 960,
		minHeight: 800,
		saveState: true,
	},
	settings: {
		title: t("main.window.settings"),
		width: 760,
		height: 680,
		minWidth: 600,
		minHeight: 400,
		to: "/settings/services",
	},
	update: {
		title: t("main.window.update"),
		width: 480,
		height: 400,
		minWidth: 400,
		minHeight: 300,
		to: "/update",
		singleton: true,
	},
	splash: {
		title: t("shell.biyori"),
		width: 380,
		height: 240,
		minWidth: 380,
		minHeight: 240,
		maxWidth: 380,
		maxHeight: 240,
		to: "/splash",
		singleton: true,
		resizable: false,
		alwaysOnTop: true,
	},
});
