import { is } from "@electron-toolkit/utils";
import { BrowserWindow, shell, type BrowserWindowConstructorOptions } from "electron";
import { join } from "node:path";
import icon from "../../../resources/icon.png?asset";
import { attachTrpcWindow } from "../trpc-handler";
import { attachWindowState } from "./state";

export type WindowDefinition = {
	title: string;
	width: number;
	height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
	to?: string;
	singleton?: boolean;
	saveState?: boolean;
	alwaysOnTop?: boolean;
};

export type OpenWindowOptions = {
	show?: boolean;
	skipTaskbar?: boolean;
};

type WindowEntry = {
	id: string;
	win: BrowserWindow;
};

function loadAppUrl(win: BrowserWindow, to?: string): void {
	const rendererUrl = process.env.ELECTRON_RENDERER_URL;
	if (is.dev && rendererUrl) {
		const url = new URL(rendererUrl);
		if (to) {
			url.searchParams.set("to", to);
		}
		void win.loadURL(url.toString());
		return;
	}

	void win.loadFile(join(__dirname, "../renderer/index.html"), {
		query: to ? { to } : {},
	});
}

function centerOnParent(win: BrowserWindow, parent: BrowserWindow): void {
	if (win.isDestroyed() || parent.isDestroyed()) {
		return;
	}
	const parentBounds = parent.getBounds();
	const { width, height } = win.getBounds();
	win.setPosition(
		Math.round(parentBounds.x + (parentBounds.width - width) / 2),
		Math.round(parentBounds.y + (parentBounds.height - height) / 2),
	);
}

export class WindowManager<TId extends string> {
	private readonly windows = new Map<TId, WindowEntry>();

	constructor(private readonly definitions: Record<TId, WindowDefinition>) {}

	get(id: TId): BrowserWindow | null {
		const entry = this.windows.get(id);
		if (!entry || entry.win.isDestroyed()) {
			this.windows.delete(id);
			return null;
		}
		return entry.win;
	}

	open(id: TId, options: OpenWindowOptions = {}): BrowserWindow {
		const definition = this.definitions[id];
		const singleton = definition.singleton !== false;
		const existing = this.get(id);
		if (singleton && existing) {
			existing.show();
			existing.focus();
			return existing;
		}

		const show = options.show ?? true;
		const parent = id === "main" ? undefined : (this.get("main" as TId) ?? undefined);
    const skipTaskbar = options.skipTaskbar ?? false;
    const alwaysOnTop = definition.alwaysOnTop ?? false;
		const win = this.createChrome({
      ...definition,
			show,
			skipTaskbar,
			alwaysOnTop,
			parent,
		});

		this.windows.set(id, { id, win });
		win.on("closed", () => {
			if (this.windows.get(id)?.win === win) {
				this.windows.delete(id);
			}
		});

		if (definition.saveState) {
			attachWindowState(win, String(id), {
				width: definition.width,
				height: definition.height,
			});
		} else if (parent) {
			centerOnParent(win, parent);
		}

		loadAppUrl(win, definition.to);
		return win;
	}

	close(id: TId): void {
		this.get(id)?.close();
	}

	destroyAll(): void {
		const ids = [...this.windows.keys()].filter((id) => id !== "main");
		for (const id of ids) {
			this.close(id);
		}
		this.close("main" as TId);
		this.windows.clear();
	}

	private createChrome(options: {
		title: string;
		width: number;
		height: number;
		minWidth?: number;
		minHeight?: number;
		maxWidth?: number;
		maxHeight?: number;
		show: boolean;
		skipTaskbar: boolean;
		alwaysOnTop: boolean;
		parent?: BrowserWindow;
	}): BrowserWindow {
		const ctor: BrowserWindowConstructorOptions = {
      ...options,
			show: false,
			center: !options.parent,
			frame: false,
			autoHideMenuBar: true,
			...(process.platform === "linux" ? { icon } : {}),
			webPreferences: {
				preload: join(__dirname, "../preload/index.js"),
				sandbox: false,
				contextIsolation: true,
			},
		};

		const win = new BrowserWindow(ctor);

		win.on("ready-to-show", () => {
			if (!options.show) {
				return;
			}
			win.show();
		});

		win.webContents.setWindowOpenHandler((details) => {
			void shell.openExternal(details.url);
			return { action: "deny" };
		});

		attachTrpcWindow(win);
		return win;
	}
}
