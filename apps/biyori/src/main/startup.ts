import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { app } from "electron";
import type { AppSettings } from "../lib/schemas/app-settings";
import {
	argvIsStartupLaunch,
	linuxAutostartDesktopEntry,
	STARTUP_FLAG,
	windowsLoginItemArgs,
} from "./startup-login";

export { STARTUP_FLAG, argvIsStartupLaunch } from "./startup-login";

export function isStartupLaunch(): boolean {
	return argvIsStartupLaunch(process.argv, app.getLoginItemSettings());
}

function linuxAutostartFile(): string {
	const configDir = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
	return join(configDir, "autostart", "net.venipa.biyori.desktop");
}

function linuxExecArgs(settings: Pick<AppSettings, "autostartTray">): string[] {
	const args = [process.env.APPIMAGE || process.execPath];
	if (!app.isPackaged) {
		args.push(app.getAppPath());
	}
	if (settings.autostartTray) {
		args.push(STARTUP_FLAG);
	}
	return args;
}

function syncLinuxAutostart(settings: Pick<AppSettings, "autostart" | "autostartTray">): void {
	const file = linuxAutostartFile();
	if (!settings.autostart) {
		try {
			unlinkSync(file);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				throw error;
			}
		}
		return;
	}
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(
		file,
		linuxAutostartDesktopEntry({
			name: "Biyori",
			execArgs: linuxExecArgs(settings),
		}),
		"utf8",
	);
}

export function syncLoginItem(settings: Pick<AppSettings, "autostart" | "autostartTray">): void {
	if (process.platform === "linux") {
		syncLinuxAutostart(settings);
		return;
	}

	if (process.platform === "darwin") {
		app.setLoginItemSettings({
			openAtLogin: settings.autostart,
			openAsHidden: settings.autostart && settings.autostartTray,
		});
		return;
	}

	const args = windowsLoginItemArgs(process.execPath);
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
