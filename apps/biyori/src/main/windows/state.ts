import { logger } from "@biyori/logger";
import { type BrowserWindow, type Rectangle, screen } from "electron";
import { createYmlStore } from "../lib/store/createYmlStore";
import { clampRectToWorkArea } from "./work-area";

type SavedWindowState = {
	x?: number;
	y?: number;
	width: number;
	height: number;
	maximized?: boolean;
};

const log = logger.child("window-state");

export function clampBoundsToWorkArea(bounds: Rectangle): Rectangle {
	return clampRectToWorkArea(bounds, screen.getDisplayMatching(bounds).workArea);
}

export function clampWindowToWorkArea(win: BrowserWindow): void {
	if (win.isDestroyed() || win.isMinimized() || win.isMaximized() || win.isFullScreen()) {
		return;
	}
	const current = win.getBounds();
	const next = clampBoundsToWorkArea(current);
	if (next.x === current.x && next.y === current.y && next.width === current.width && next.height === current.height) {
		return;
	}
	win.setBounds(next);
}

export function attachWindowState(win: BrowserWindow, name: string, defaults: { width: number; height: number }): void {
	const store = createYmlStore<SavedWindowState>(name);
	const restored: SavedWindowState = {
		width: Number(store.get("width", defaults.width)) || defaults.width,
		height: Number(store.get("height", defaults.height)) || defaults.height,
		x: store.get("x"),
		y: store.get("y"),
		maximized: Boolean(store.get("maximized", false)),
	};

	if (typeof restored.x === "number" && typeof restored.y === "number") {
		win.setBounds(
			clampBoundsToWorkArea({
				x: restored.x,
				y: restored.y,
				width: restored.width,
				height: restored.height,
			}),
		);
	} else {
		win.setSize(restored.width, restored.height);
		clampWindowToWorkArea(win);
	}

	if (restored.maximized) {
		win.maximize();
	}

	const save = (): void => {
		if (win.isDestroyed()) {
			return;
		}
		const next: SavedWindowState = {
			...restored,
			maximized: win.isMaximized(),
		};
		if (!win.isMinimized() && !win.isMaximized()) {
			const [x, y] = win.getPosition();
			const [width, height] = win.getSize();
			next.x = x;
			next.y = y;
			next.width = width;
			next.height = height;
		}
		store.set("x", next.x);
		store.set("y", next.y);
		store.set("width", next.width);
		store.set("height", next.height);
		store.set("maximized", next.maximized);
		log.debug("save", name, next);
	};

	win.on("close", save);
}
