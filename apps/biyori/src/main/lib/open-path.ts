import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { BrowserWindow, shell } from "electron";

let restoreTimer: ReturnType<typeof setTimeout> | null = null;

export function restoreAppWindowsEnabled(): void {
	const run = (): void => {
		for (const win of BrowserWindow.getAllWindows()) {
			if (!win.isDestroyed()) {
				win.setEnabled(true);
			}
		}
	};
	run();
	if (restoreTimer) {
		clearTimeout(restoreTimer);
	}
	// ponytail: Windows can disable the owner HWND after Explorer/ShellExecute returns; re-enable once the OS has applied it. Upgrade: open folders without an owner HWND from Electron.
	restoreTimer = setTimeout(() => {
		restoreTimer = null;
		run();
	}, 50);
}

export function openPathInOs(target: string): void {
	if (process.platform === "win32") {
		try {
			if (statSync(target).isDirectory()) {
				spawn("explorer.exe", [target], { detached: true, stdio: "ignore" }).unref();
				return;
			}
		} catch {
			// fall through
		}
	}
	void shell.openPath(target);
}
