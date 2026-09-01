import { join } from "node:path";
import { is } from "@electron-toolkit/utils";
import { BrowserWindow, type BrowserWindowConstructorOptions, shell } from "electron";
import icon from "../../../resources/icon.png?asset";
import { attachTrpcWindow } from "../trpc-handler";
import { attachWindowState } from "./state";
import { attachWindowZoom, startWindowZoomSync } from "./zoom";

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
	modal?: boolean;
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
	const hash = to ? (to.startsWith("/") ? to : `/${to}`) : "";
	const rendererUrl = process.env.ELECTRON_RENDERER_URL;
	if (is.dev && rendererUrl) {
		const url = new URL(rendererUrl);
		if (hash) {
			url.hash = hash;
		}
		void win.loadURL(url.toString());
		return;
	}

	void win.loadFile(join(__dirname, "../renderer/index.html"), hash ? { hash } : {});
}

function centerOnParent(win: BrowserWindow, parent: BrowserWindow): void {
	if (win.isDestroyed() || parent.isDestroyed()) {
		return;
	}
	const parentBounds = parent.getBounds();
	const { width, height } = win.getBounds();
	win.setPosition(Math.round(parentBounds.x + (parentBounds.width - width) / 2), Math.round(parentBounds.y + (parentBounds.height - height) / 2));
}

export class WindowManager<TId extends string> {
	private readonly windows = new Map<TId, WindowEntry>();
	private readonly modalListeners = new Set<(open: boolean) => void>();

	constructor(private readonly definitions: Record<TId, WindowDefinition>) {
		startWindowZoomSync((fn) => this.forEachWindow(fn));
	}

	forEachWindow(fn: (win: BrowserWindow) => void): void {
		for (const entry of this.windows.values()) {
			if (!entry.win.isDestroyed()) {
				fn(entry.win);
			}
		}
	}

	get(id: TId): BrowserWindow | null {
		const entry = this.windows.get(id);
		if (!entry || entry.win.isDestroyed()) {
			this.windows.delete(id);
			return null;
		}
		return entry.win;
	}

	hasModalChild(): boolean {
		for (const [id, entry] of this.windows) {
			if (id === "main" || entry.win.isDestroyed()) {
				continue;
			}
			if (this.definitions[id]?.modal) {
				return true;
			}
		}
		return false;
	}

	subscribeModalChild(listener: (open: boolean) => void): () => void {
		this.modalListeners.add(listener);
		listener(this.hasModalChild());
		return () => {
			this.modalListeners.delete(listener);
		};
	}

	focusModalChild(): void {
		for (const [id, entry] of this.windows) {
			if (id === "main" || entry.win.isDestroyed() || !this.definitions[id]?.modal) {
				continue;
			}
			entry.win.show();
			entry.win.focus();
			return;
		}
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
		const modal = Boolean(definition.modal && parent);
		const win = this.createChrome({
			title: definition.title,
			width: definition.width,
			height: definition.height,
			minWidth: definition.minWidth,
			minHeight: definition.minHeight,
			maxWidth: definition.maxWidth,
			maxHeight: definition.maxHeight,
			show,
			skipTaskbar,
			alwaysOnTop,
			modal,
			parent,
		});

		this.windows.set(id, { id, win });
		win.on("closed", () => {
			if (this.windows.get(id)?.win === win) {
				this.windows.delete(id);
			}
			this.emitModalChild();
		});
		this.emitModalChild();

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
		const win = this.get(id);
		if (!win) {
			return;
		}
		win.hide();
		win.close();
	}

	destroyAll(): void {
		const ids = [...this.windows.keys()].filter((id) => id !== "main");
		for (const id of ids) {
			this.close(id);
		}
		this.close("main" as TId);
		this.windows.clear();
	}

	private emitModalChild(): void {
		const open = this.hasModalChild();
		for (const listener of this.modalListeners) {
			listener(open);
		}
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
		modal: boolean;
		parent?: BrowserWindow;
	}): BrowserWindow {
		const ctor: BrowserWindowConstructorOptions = {
			title: options.title,
			width: options.width,
			height: options.height,
			minWidth: options.minWidth,
			minHeight: options.minHeight,
			maxWidth: options.maxWidth,
			maxHeight: options.maxHeight,
			show: false,
			skipTaskbar: options.skipTaskbar,
			alwaysOnTop: options.alwaysOnTop,
			modal: options.modal,
			parent: options.parent,
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
		attachWindowZoom(win);
		return win;
	}
}
