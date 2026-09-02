import { type BrowserWindow, type Display, type Event, type Input, screen } from "electron";
import { loadAppSettings, subscribeSettings } from "../settings";
import { clampWindowToWorkArea } from "./state";

const ZOOM_KEYS = new Set(["+", "-", "=", "0", "Add", "Subtract", "NumpadAdd", "NumpadSubtract"]);

const DPI_METRICS = new Set(["scaleFactor", "bounds"]);

export function uiZoomToFactor(percent: number): number {
	return percent / 100;
}

function applyUiZoom(win: BrowserWindow, percent: number = loadAppSettings().uiZoom, force: boolean = false): void {
	if (win.isDestroyed()) {
		return;
	}
	const factor = uiZoomToFactor(percent);
	if (!force && win.webContents.getZoomFactor() === factor) {
		return;
	}
	win.webContents.setZoomFactor(factor);
}

function isZoomIdle(win: BrowserWindow): boolean {
	return win.isDestroyed() || win.isMinimized() || !win.isVisible() || !win.isFocused();
}

function restoreUiZoom(win: BrowserWindow): void {
	applyUiZoom(win, loadAppSettings().uiZoom, true);
}

function isZoomShortcut(input: Input): boolean {
	if (!(input.control || input.meta) || input.alt) {
		return false;
	}
	return ZOOM_KEYS.has(input.key);
}

let settingsWatchStarted = false;

export function startWindowZoomSync(forEach: (fn: (win: BrowserWindow) => void) => void): void {
	if (settingsWatchStarted) {
		return;
	}
	settingsWatchStarted = true;
	subscribeSettings((settings) => {
		forEach((win) => {
			applyUiZoom(win, settings.uiZoom);
		});
	});
}

export function attachWindowZoom(win: BrowserWindow): void {
	void win.webContents.setVisualZoomLevelLimits(1, 1);
	applyUiZoom(win);

	win.webContents.on("before-input-event", (event, input) => {
		if (input.type !== "keyDown" && input.type !== "keyUp") {
			return;
		}
		if (isZoomShortcut(input)) {
			event.preventDefault();
		}
	});

	win.webContents.on("did-finish-load", () => {
		applyUiZoom(win);
	});
	win.webContents.on("zoom-changed", () => {
		if (isZoomIdle(win)) {
			return;
		}
		applyUiZoom(win);
	});
	win.on("focus", () => restoreUiZoom(win));
	win.on("restore", () => restoreUiZoom(win));
	win.on("show", () => restoreUiZoom(win));

	const onDisplayMetricsChanged = (_event: Event, _display: Display, changedMetrics: string[]): void => {
		if (isZoomIdle(win) || !changedMetrics.some((metric) => DPI_METRICS.has(metric))) {
			return;
		}
		applyUiZoom(win);
		clampWindowToWorkArea(win);
	};
	const onDisplayRemoved = (): void => {
		if (isZoomIdle(win)) {
			return;
		}
		applyUiZoom(win);
		clampWindowToWorkArea(win);
	};

	screen.on("display-metrics-changed", onDisplayMetricsChanged);
	screen.on("display-removed", onDisplayRemoved);
	win.on("closed", () => {
		screen.off("display-metrics-changed", onDisplayMetricsChanged);
		screen.off("display-removed", onDisplayRemoved);
	});
}
