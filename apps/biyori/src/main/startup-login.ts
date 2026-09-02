import { basename } from "node:path";

export const STARTUP_FLAG = "--startup";

export type LoginLaunchInfo = {
	wasOpenedAtLogin?: boolean;
	wasOpenedAsHidden?: boolean;
};

export function argvIsStartupLaunch(argv: readonly string[], login: LoginLaunchInfo = {}): boolean {
	if (argv.includes(STARTUP_FLAG)) {
		return true;
	}
	return Boolean(login.wasOpenedAtLogin || login.wasOpenedAsHidden);
}

export function shouldStartInTray(startupLaunch: boolean, autostartTray: boolean): boolean {
	return startupLaunch && autostartTray;
}

export function quoteDesktopExecArg(value: string): string {
	if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
		return value;
	}
	return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function linuxAutostartDesktopEntry(opts: { name: string; execArgs: readonly string[] }): string {
	const exec = opts.execArgs.map(quoteDesktopExecArg).join(" ");
	return [
		"[Desktop Entry]",
		"Type=Application",
		"Version=1.0",
		`Name=${opts.name}`,
		"Comment=Anime library tracker",
		`Exec=${exec}`,
		"Terminal=false",
		"StartupNotify=false",
		"X-GNOME-Autostart-enabled=true",
		"",
	].join("\n");
}

export function windowsLoginItemArgs(execPath: string): string[] {
	return ["--processStart", `"${basename(execPath)}"`, STARTUP_FLAG];
}
