import { join } from "node:path";
import { is, platform } from "@electron-toolkit/utils";
import { app, BrowserWindow, type BrowserWindowConstructorOptions, nativeTheme, shell } from "electron";
import iconWin from "../../../resources/icon.ico?asset";
import icon from "../../../resources/logo.png?asset";
import { attachTrpcWindow } from "../trpc-handler";
import { attachRendererNavigationGuard } from "./navigation";
import { ownerFollowDelta } from "./owner-follow";
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
	resizable?: boolean;
};

export type OpenWindowOptions = {
	show?: boolean;
	skipTaskbar?: boolean;
	to?: string;
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

function windowBackgroundColor(): string {
	return nativeTheme.shouldUseDarkColors ? "#252525" : "#ffffff";
}

function centerOnParent(win: BrowserWindow, parent: BrowserWindow): void {
	if (win.isDestroyed() || parent.isDestroyed()) {
		return;
	}
	const parentBounds = parent.getBounds();
	const { width, height } = win.getBounds();
	win.setPosition(Math.round(parentBounds.x + (parentBounds.width - width) / 2), Math.round(parentBounds.y + (parentBounds.height - height) / 2));
}

function parentIsFixed(parent: BrowserWindow): boolean {
	return parent.isDestroyed() || parent.isMaximized() || parent.isFullScreen() || parent.isMinimized();
}

/**
 * Dragging settings moves the main window by the same amount.
 * An owned window already follows its owner, so an owner drag is ignored.
 * Resizing settings from the top or left changes position and must not drag the owner.
 * Moving the owner can shift the child again; that echo is put back so the offset stays put.
 */
function attachOwnerFollow(child: BrowserWindow, parent: BrowserWindow): void {
	let lastChild = child.getBounds();
	let lastParent = parent.getBounds();
	let applying = false;
	let echo: { dx: number; dy: number } | null = null;

	child.on("move", () => {
		if (applying || child.isDestroyed() || parent.isDestroyed()) {
			return;
		}
		const next = child.getBounds();
		const parentNow = parent.getBounds();
		const childDx = next.x - lastChild.x;
		const childDy = next.y - lastChild.y;
		const parentDx = parentNow.x - lastParent.x;
		const parentDy = parentNow.y - lastParent.y;
		const resized = next.width !== lastChild.width || next.height !== lastChild.height;
		const pending = echo;
		echo = null;
		if (pending && childDx === pending.dx && childDy === pending.dy && parentDx === 0 && parentDy === 0) {
			applying = true;
			child.setPosition(lastChild.x, lastChild.y);
			applying = false;
			lastChild = child.getBounds();
			lastParent = parent.getBounds();
			return;
		}
		const delta = ownerFollowDelta({
			childDx,
			childDy,
			parentDx,
			parentDy,
			resized,
			parentFixed: parentIsFixed(parent),
		});
		lastChild = next;
		lastParent = parentNow;
		if (!delta) {
			return;
		}
		applying = true;
		parent.setPosition(Math.round(parentNow.x + delta.dx), Math.round(parentNow.y + delta.dy));
		const shifted = child.getBounds();
		if (shifted.x !== next.x || shifted.y !== next.y) {
			child.setPosition(next.x, next.y);
		} else {
			echo = delta;
		}
		lastChild = child.getBounds();
		lastParent = parent.getBounds();
		applying = false;
	});
}

function stealWindowFocus(win: BrowserWindow): void {
	if (win.isDestroyed()) {
		return;
	}
	if (win.isMinimized()) {
		win.restore();
	}
	win.moveTop();
	win.focus();
	if (process.platform === "darwin") {
		app.focus({ steal: true });
	}
}

export class WindowManager<TId extends string> {
	private readonly windows = new Map<TId, WindowEntry>();
	private readonly settingsOverlayListeners = new Set<(open: boolean) => void>();

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

	hasSettingsOverlay(): boolean {
		const entry = this.windows.get("settings" as TId);
		return Boolean(entry && !entry.win.isDestroyed() && entry.win.isVisible());
	}

	subscribeSettingsOverlay(listener: (open: boolean) => void): () => void {
		this.settingsOverlayListeners.add(listener);
		listener(this.hasSettingsOverlay());
		return () => {
			this.settingsOverlayListeners.delete(listener);
		};
	}

	focusSettings(): void {
		const win = this.get("settings" as TId);
		if (!win) {
			this.emitSettingsOverlay();
			return;
		}
		win.show();
		win.focus();
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
		const isMac = process.platform === "darwin";
		const skipTaskbar = options.skipTaskbar ?? Boolean(parent && !isMac);
		const alwaysOnTop = definition.alwaysOnTop ?? Boolean(definition.modal && parent);
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
			modal: false,
			parent,
			resizable: definition.resizable,
		});

		this.windows.set(id, { id, win });
		if (id === "settings") {
			win.on("show", () => {
				this.emitSettingsOverlay();
			});
			win.on("hide", () => {
				this.emitSettingsOverlay();
			});
			this.emitSettingsOverlay();
		}
		win.on("closed", () => {
			if (this.windows.get(id)?.win === win) {
				this.windows.delete(id);
			}
			if (id === "settings") {
				this.emitSettingsOverlay();
			}
			if (parent && !parent.isDestroyed()) {
				stealWindowFocus(parent);
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
		if (id === "settings" && parent) {
			attachOwnerFollow(win, parent);
		}

		loadAppUrl(win, options.to ?? definition.to);
		return win;
	}

	close(id: TId): void {
		const win = this.get(id);
		if (!win) {
			return;
		}
		this.dismiss(win);
	}

	/** Child/modal windows must be destroyed. hide()+close() leaves the parent sheet-locked on macOS. */
	dismiss(win: BrowserWindow): void {
		if (win.isDestroyed()) {
			return;
		}
		if (win.getParentWindow()) {
			win.destroy();
			return;
		}
		win.hide();
		win.close();
	}

	destroyAll(): void {
		const wins = [...this.windows.values()].map((entry) => entry.win);
		this.windows.clear();
		for (const win of wins) {
			if (!win.isDestroyed()) {
				win.destroy();
			}
		}
	}

	private emitSettingsOverlay(): void {
		const open = this.hasSettingsOverlay();
		for (const listener of this.settingsOverlayListeners) {
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
		resizable?: boolean;
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
			skipTaskbar: platform.isMacOS ? false : options.skipTaskbar,
			alwaysOnTop: options.alwaysOnTop,
			modal: options.modal,
			parent: options.parent,
			center: !options.parent,
			frame: false,
			fullscreenable: !options.parent,
			backgroundColor: windowBackgroundColor(),
			autoHideMenuBar: true,
			acceptFirstMouse: platform.isMacOS,
			...(platform.isLinux ? { icon } : {}),
			...(platform.isWindows ? { icon: iconWin } : {}),
			...(options.resizable === false ? { resizable: false } : {}),
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
			void shell.openExternal(details.url).finally(() => {
				if (!win.isDestroyed()) {
					win.setEnabled(true);
				}
			});
			return { action: "deny" };
		});
		attachRendererNavigationGuard(win);

		attachTrpcWindow(win);
		attachWindowZoom(win);
		return win;
	}
}
