import type { Migration } from "electron-conf/main";
import type { AppSettings } from "../../../lib/schemas/app-settings";

export const appStoreMigrations: Migration<AppSettings>[] = [
	{
		version: 1,
		hook: (conf) => {
			if (!conf.has("onboardingComplete")) {
				conf.set("onboardingComplete", true);
			}
		},
	},
];
