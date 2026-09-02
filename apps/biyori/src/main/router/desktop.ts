import { readFile, writeFile } from "node:fs/promises";
import { observable } from "@trpc/server/observable";
import { app, dialog, Menu, shell } from "electron";
import { z } from "zod";
import { requestQuit } from "../handlers/quit-handler";
import { setTrayState } from "../handlers/tray-state";
import { decryptPublicData, encryptPublicData } from "../lib/store/createYmlStore";
import { t } from "../trpc";
import { windowManager } from "../windows";

const BIYORI_FILE_FILTERS = [{ name: "Biyori", extensions: ["biyori"] }];

function requireWindow(getBrowserWindow: () => Electron.BrowserWindow | null) {
	const win = getBrowserWindow();
	if (!win || win.isDestroyed()) {
		throw new Error("No browser window");
	}
	return win;
}

type WindowChromeState = {
	maximized: boolean;
	focused: boolean;
	minimizable: boolean;
	maximizable: boolean;
	closable: boolean;
};

function readWindowChrome(win: Electron.BrowserWindow | null): WindowChromeState {
	if (!win || win.isDestroyed()) {
		return { maximized: false, focused: false, minimizable: false, maximizable: false, closable: false };
	}
	return {
		maximized: win.isMaximized() || win.isFullScreen(),
		focused: win.isFocused(),
		minimizable: win.isMinimizable(),
		maximizable: win.isMaximizable(),
		closable: win.isClosable(),
	};
}

export const desktopRouter = t.router({
	openSettings: t.procedure.mutation(() => {
		windowManager.open("settings");
		return { ok: true as const };
	}),
	closeSettings: t.procedure.mutation(() => {
		windowManager.close("settings");
		return { ok: true as const };
	}),
	openUpdate: t.procedure.mutation(() => {
		windowManager.open("update");
		return { ok: true as const };
	}),
	closeUpdate: t.procedure.mutation(() => {
		windowManager.close("update");
		return { ok: true as const };
	}),
	focusModalChild: t.procedure.mutation(() => {
		windowManager.focusModalChild();
		return { ok: true as const };
	}),
	onParentDimmed: t.procedure.subscription(() => {
		return observable<boolean>((emit) => {
			return windowManager.subscribeModalChild((open) => {
				emit.next(open);
			});
		});
	}),
	onWindowState: t.procedure.subscription(({ ctx }) => {
		return observable<WindowChromeState>((emit) => {
			const win = ctx.getBrowserWindow();
			const push = (): void => {
				emit.next(readWindowChrome(win));
			};
			push();
			if (!win || win.isDestroyed()) {
				return () => undefined;
			}
			win.on("maximize", push);
			win.on("unmaximize", push);
			win.on("enter-full-screen", push);
			win.on("leave-full-screen", push);
			win.on("focus", push);
			win.on("blur", push);
			return () => {
				if (win.isDestroyed()) {
					return;
				}
				win.off("maximize", push);
				win.off("unmaximize", push);
				win.off("enter-full-screen", push);
				win.off("leave-full-screen", push);
				win.off("focus", push);
				win.off("blur", push);
			};
		});
	}),
	minimizeWindow: t.procedure.mutation(({ ctx }) => {
		requireWindow(ctx.getBrowserWindow).minimize();
		return { ok: true as const };
	}),
	toggleMaximizeWindow: t.procedure.mutation(({ ctx }) => {
		const win = requireWindow(ctx.getBrowserWindow);
		if (win.isMaximized()) {
			win.unmaximize();
		} else {
			win.maximize();
		}
		return { maximized: win.isMaximized() };
	}),
	closeWindow: t.procedure.mutation(({ ctx }) => {
		const win = requireWindow(ctx.getBrowserWindow);
		if (win.isClosable()) {
			win.hide();
			win.close();
		}
		return { ok: true as const };
	}),
	quit: t.procedure.input(z.object({ force: z.boolean().optional() }).optional()).mutation(async ({ input }) => {
		await requestQuit(!!input?.force);
		return { ok: true as const };
	}),
	restore: t.procedure.mutation(() => {
		setTrayState("visible");
		return { ok: true as const };
	}),
	windowState: t.procedure.query(({ ctx }) => {
		const win = ctx.getBrowserWindow();
		return { maximized: win?.isMaximized() ?? false };
	}),
	openPath: t.procedure.input(z.object({ path: z.string().min(1) })).mutation(async ({ input }) => {
		const error = await shell.openPath(input.path);
		return { ok: error.length === 0 };
	}),
	openExternal: t.procedure.input(z.object({ url: z.string().min(1) })).mutation(async ({ input }) => {
		await shell.openExternal(input.url);
		return { ok: true as const };
	}),
	pickFolder: t.procedure.mutation(async ({ ctx }) => {
		const win = ctx.getBrowserWindow();
		const options = {
			defaultPath: app.getPath("home"),
			properties: ["openDirectory"] as Array<"openDirectory">,
		};
		const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
		const path = result.canceled ? null : (result.filePaths[0] ?? null);
		return { path };
	}),
	pickFile: t.procedure.mutation(async ({ ctx }) => {
		const win = ctx.getBrowserWindow();
		const options = {
			defaultPath: app.getPath("home"),
			properties: ["openFile"] as Array<"openFile">,
		};
		const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
		const path = result.canceled ? null : (result.filePaths[0] ?? null);
		return { path };
	}),
	exportBiyori: t.procedure
		.input(
			z.object({
				defaultName: z.string().min(1),
				payload: z.record(z.string(), z.unknown()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const win = ctx.getBrowserWindow();
			const options = {
				defaultPath: input.defaultName,
				filters: BIYORI_FILE_FILTERS,
			};
			const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
			if (result.canceled || !result.filePath) {
				return { ok: false as const, canceled: true as const };
			}
			await writeFile(result.filePath, encryptPublicData(input.payload), "utf8");
			return { ok: true as const, canceled: false as const };
		}),
	importBiyori: t.procedure.mutation(async ({ ctx }) => {
		const win = ctx.getBrowserWindow();
		const options = {
			defaultPath: app.getPath("home"),
			filters: BIYORI_FILE_FILTERS,
			properties: ["openFile"] as Array<"openFile">,
		};
		const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
		const path = result.canceled ? null : (result.filePaths[0] ?? null);
		if (!path) {
			return { ok: false as const, canceled: true as const, payload: null };
		}
		try {
			const raw = await readFile(path, "utf8");
			const payload = decryptPublicData(raw);
			return { ok: true as const, canceled: false as const, payload };
		} catch {
			return {
				ok: false as const,
				canceled: false as const,
				payload: null,
			};
		}
	}),
	showDefaultContextMenu: t.procedure.mutation(() => {
		Menu.buildFromTemplate([{ role: "cut" }, { role: "copy" }, { role: "paste" }, { type: "separator" }, { role: "selectAll" }]).popup();
		return { ok: true as const };
	}),
});
