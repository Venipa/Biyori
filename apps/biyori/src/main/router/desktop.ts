import { app, dialog, Menu, shell } from "electron";
import { z } from "zod";
import { requestQuit } from "../handlers/quit-handler";
import { setTrayState } from "../handlers/tray-state";
import { t } from "../trpc";
import { windowManager } from "../windows";

function requireWindow(getBrowserWindow: () => Electron.BrowserWindow | null) {
	const win = getBrowserWindow();
	if (!win || win.isDestroyed()) {
		throw new Error("No browser window");
	}
	return win;
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
			win.close();
		}
		return { ok: true as const };
	}),
	quit: t.procedure
		.input(z.object({ force: z.boolean().optional() }).optional())
		.mutation(async ({ input }) => {
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
	openPath: t.procedure
		.input(z.object({ path: z.string().min(1) }))
		.mutation(async ({ input }) => {
			const error = await shell.openPath(input.path);
			return { ok: error.length === 0 };
		}),
	openExternal: t.procedure
		.input(z.object({ url: z.string().min(1) }))
		.mutation(async ({ input }) => {
			await shell.openExternal(input.url);
			return { ok: true as const };
		}),
	pickFolder: t.procedure.mutation(async ({ ctx }) => {
		const win = ctx.getBrowserWindow();
		const options = {
			defaultPath: app.getPath("home"),
			properties: ["openDirectory"] as Array<"openDirectory">,
		};
		const result = win
			? await dialog.showOpenDialog(win, options)
			: await dialog.showOpenDialog(options);
		const path = result.canceled ? null : (result.filePaths[0] ?? null);
		return { path };
	}),
	pickFile: t.procedure.mutation(async ({ ctx }) => {
		const win = ctx.getBrowserWindow();
		const options = {
			defaultPath: app.getPath("home"),
			properties: ["openFile"] as Array<"openFile">,
		};
		const result = win
			? await dialog.showOpenDialog(win, options)
			: await dialog.showOpenDialog(options);
		const path = result.canceled ? null : (result.filePaths[0] ?? null);
		return { path };
	}),
	showDefaultContextMenu: t.procedure.mutation(() => {
		Menu.buildFromTemplate([
			{ role: "cut" },
			{ role: "copy" },
			{ role: "paste" },
			{ type: "separator" },
			{ role: "selectAll" },
		]).popup();
		return { ok: true as const };
	}),
});
