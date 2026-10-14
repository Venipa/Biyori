import type { BrowserWindow } from "electron";

const WIN_FILE_CHARS = /[<>:"/\\|?*]/g;

export function safeFileStem(value: string, fallback = "file"): string {
	const cleaned = value.replace(WIN_FILE_CHARS, "_").trim();
	return cleaned.slice(0, 80) || fallback;
}

const FILE_EXTENSIONS = {
	"image/png": "png",
	"image/webp": "webp",
	"image/jpg": "jpg",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/bmp": "bmp",
	"image/tiff": "tiff",
} as const;

export function imageExtFromMime(mime: string): string {
	return FILE_EXTENSIONS[mime as keyof typeof FILE_EXTENSIONS] ?? "jpg";
}

export async function runFileDialog<T>(win: BrowserWindow | null, run: () => Promise<T>): Promise<T> {
	const owner = win && !win.isDestroyed() ? win : null;
	const nested = Boolean(owner?.getParentWindow());
	if (nested && owner) {
		owner.hide();
	}
	try {
		// Unparented: attaching the dialog to main uses the same Windows sheet-disable
		// as a modal child, and that dim can stick after close.
		return await run();
	} finally {
		if (nested && owner && !owner.isDestroyed()) {
			owner.show();
			owner.focus();
		} else if (owner && !owner.isDestroyed()) {
			owner.focus();
		}
	}
}
