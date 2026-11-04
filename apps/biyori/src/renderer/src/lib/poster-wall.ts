export function posterColumns(width: number, tileWidth: number, gap: number): number {
	return Math.max(1, Math.floor((width + gap) / (tileWidth + gap)));
}

export function chunk<T>(items: T[], size: number): T[][] {
	const rows: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		rows.push(items.slice(index, index + size));
	}
	return rows;
}
