import { logger } from "@biyori/logger";
import { type BrowserWindow, type Rectangle, screen } from "electron";
import { z } from "zod";
import { createYmlStore } from "../lib/store/createYmlStore";
import { clampRectToWorkArea } from "./work-area";

const windowStateSchema = (defaults: { width: number; height: number }) =>
	z.object({
		x: z.number().optional(),
		y: z.number().optional(),
		width: z.number().default(defaults.width),
		height: z.number().default(defaults.height),
		maximized: z.boolean().optional(),
	});
type SavedWindowState = z.infer<ReturnType<typeof windowStateSchema>>;

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
	const schema = windowStateSchema(defaults);
	const store = createYmlStore<SavedWindowState>(name, { ext: ".yml", zodSchema: schema });
	const storeValues = store.store;
	const restored: SavedWindowState = schema.parse(storeValues);

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
		store.set({
			x: next.x,
			y: next.y,
			width: next.width,
			height: next.height,
			maximized: next.maximized,
		});
		log.debug("save", name, next);
	};

	win.on("close", save);
}
