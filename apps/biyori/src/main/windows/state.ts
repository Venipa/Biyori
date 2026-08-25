import { type BrowserWindow, screen } from "electron";
import { createYmlStore } from "../lib/store/createYmlStore";
import { logger } from "../logger";

type SavedWindowState = {
	x?: number;
	y?: number;
	width: number;
	height: number;
	maximized?: boolean;
};

const log = logger.child("window-state");

function isOnDisplay(state: SavedWindowState): boolean {
	if (typeof state.x !== "number" || typeof state.y !== "number") {
		return false;
	}
	return screen.getAllDisplays().some((display) => {
		const { x, y, width, height } = display.bounds;
		return state.x! >= x && state.y! >= y && state.x! + state.width <= x + width && state.y! + state.height <= y + height;
	});
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

	if (isOnDisplay(restored)) {
		win.setBounds({
			x: restored.x!,
			y: restored.y!,
			width: restored.width,
			height: restored.height,
		});
	} else {
		win.setSize(restored.width, restored.height);
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
