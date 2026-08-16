import { app } from "electron";
import { basename } from "node:path";
import type { AppSettings } from "../lib/schemas/app-settings";

const STARTUP_FLAG = "--startup";

export function isStartupLaunch(): boolean {
	if (process.argv.includes(STARTUP_FLAG)) {
		return true;
	}
	return Boolean(app.getLoginItemSettings().wasOpenedAtLogin);
}

function loginItemArgs(): string[] {
	if (process.platform === "win32") {
		return [
			"--processStart",
			`"${basename(process.execPath)}"`,
			STARTUP_FLAG,
		];
	}
	return [STARTUP_FLAG];
}

export function syncLoginItem(
	settings: Pick<AppSettings, "autostart" | "autostartTray">,
): void {
	const args = loginItemArgs();
	if (settings.autostart) {
		app.setLoginItemSettings({
			openAtLogin: true,
			openAsHidden: settings.autostartTray,
			path: process.execPath,
			args,
			enabled: true,
		});
		return;
	}
	app.setLoginItemSettings({
		openAtLogin: false,
		openAsHidden: false,
		path: process.execPath,
		args,
		enabled: false,
	});
}
