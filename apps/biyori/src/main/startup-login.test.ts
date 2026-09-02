import { describe, expect, test } from "bun:test";
import {
	argvIsStartupLaunch,
	linuxAutostartDesktopEntry,
	quoteDesktopExecArg,
	shouldStartInTray,
	STARTUP_FLAG,
	windowsLoginItemArgs,
} from "./startup-login";

describe("startup login helpers", () => {
	test("detects argv flag and mac login item fields", () => {
		expect(argvIsStartupLaunch(["biyori"])).toBe(false);
		expect(argvIsStartupLaunch(["biyori", STARTUP_FLAG])).toBe(true);
		expect(argvIsStartupLaunch(["biyori"], { wasOpenedAtLogin: true })).toBe(true);
		expect(argvIsStartupLaunch(["biyori"], { wasOpenedAsHidden: true })).toBe(true);
	});

	test("starts in tray only when both flags are set", () => {
		expect(shouldStartInTray(true, true)).toBe(true);
		expect(shouldStartInTray(true, false)).toBe(false);
		expect(shouldStartInTray(false, true)).toBe(false);
	});

	test("quotes desktop Exec paths with spaces", () => {
		expect(quoteDesktopExecArg("/opt/Biyori/biyori")).toBe("/opt/Biyori/biyori");
		expect(quoteDesktopExecArg("/opt/Biyori App/biyori")).toBe('"/opt/Biyori App/biyori"');
	});

	test("writes an XDG autostart desktop entry", () => {
		const body = linuxAutostartDesktopEntry({
			name: "Biyori",
			execArgs: ["/opt/Biyori/biyori", STARTUP_FLAG],
		});
		expect(body).toContain("Name=Biyori");
		expect(body).toContain(`Exec=/opt/Biyori/biyori ${STARTUP_FLAG}`);
		expect(body).toContain("X-GNOME-Autostart-enabled=true");
	});

	test("keeps windows squirrel-style login args", () => {
		expect(windowsLoginItemArgs("/opt/biyori/biyori.exe")).toEqual(["--processStart", '"biyori.exe"', STARTUP_FLAG]);
	});
});
