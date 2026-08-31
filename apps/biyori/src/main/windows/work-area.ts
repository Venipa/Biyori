export type WorkAreaRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function clampRectToWorkArea(bounds: WorkAreaRect, workArea: WorkAreaRect): WorkAreaRect {
	const width = Math.min(Math.max(1, bounds.width), workArea.width);
	const height = Math.min(Math.max(1, bounds.height), workArea.height);
	return {
		x: Math.min(Math.max(bounds.x, workArea.x), workArea.x + workArea.width - width),
		y: Math.min(Math.max(bounds.y, workArea.y), workArea.y + workArea.height - height),
		width,
		height,
	};
}
