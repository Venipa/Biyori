const BENTO_RATIO = {
	"1:1": { cols: 1, rows: 2 },
	"2:1": { cols: 2, rows: 2 },
	// 3 half-rows: 2:3, a step shorter than a true 1:2.
	"1:2": { cols: 1, rows: 3 },
} as const;

type BentoRatio = keyof typeof BENTO_RATIO;

type BentoImage = {
	src: string;
	ratio: BentoRatio;
	objectPosition: string;
	shot?: string;
};

/** Cell shape is declared here. The `bento-<ratio>-<n>` filename is only a label. */
const bentoImages = [
	{ src: "/bento-2_1-1.jpg", ratio: "2:1", objectPosition: "center" },
	{ src: "/bento-2_1-2.jpg", ratio: "2:1", objectPosition: "center 42%" },
	{ src: "/bento-1_2-1.jpg", ratio: "2:1", objectPosition: "center", shot: "/app-nowplaying-2.png" },
	{ src: "/bento-1_2-2.jpg", ratio: "1:1", objectPosition: "58% center" },
	{ src: "/bento-1_2-2.png", ratio: "1:1", objectPosition: "70% center" },
	{ src: "/bento-1_2-3.jpg", ratio: "1:1", objectPosition: "center" },
	{ src: "/bento-1_1-1.png", ratio: "1:1", objectPosition: "center 42%" },
	{ src: "/bento-1_1-2.jpg", ratio: "2:1", objectPosition: "center" },
] as const satisfies ReadonlyArray<BentoImage>;

const ANILIST = "/bento-2_1-1.jpg";
const LIBRARY = "/bento-2_1-2.jpg";
const NOW = "/bento-1_2-1.jpg";
const TORRENTS = "/bento-1_2-2.jpg";
const SHARING = "/bento-1_2-2.png";
const CHANGELOG = "/bento-1_2-3.jpg";
const SQUARE_A = "/bento-1_1-1.png";
const SQUARE_B = "/bento-1_1-2.jpg";

type Spot = { col: number; row: number; cols: number; rows: number };

export type BentoTile = {
	src: string;
	ratio: BentoRatio;
	objectPosition: string;
	shot: string | null;
	base: Spot;
	sm: Spot;
	lg: Spot;
};

function pack(columnCount: number, items: { id: string; cols: number; rows: number }[]): Map<string, Spot> {
	const grid: (string | null)[][] = [];
	const spots = new Map<string, Spot>();
	const fits = (col: number, row: number, cols: number, rows: number): boolean => {
		if (col + cols > columnCount) return false;
		for (let y = row; y < row + rows; y++) {
			for (let x = col; x < col + cols; x++) if (grid[y]?.[x]) return false;
		}
		return true;
	};
	for (const item of items) {
		let spot: { col: number; row: number } | null = null;
		for (let row = 0; row < 40 && !spot; row++) {
			for (let col = 0; col < columnCount; col++) {
				if (fits(col, row, item.cols, item.rows)) {
					spot = { col, row };
					break;
				}
			}
		}
		if (!spot) throw new Error(`bento: no cell for ${item.id}`);
		for (let y = spot.row; y < spot.row + item.rows; y++) {
			grid[y] ??= Array(columnCount).fill(null);
			for (let x = spot.col; x < spot.col + item.cols; x++) grid[y][x] = item.id;
		}
		spots.set(item.id, { col: spot.col + 1, row: spot.row + 1, cols: item.cols, rows: item.rows });
	}
	return spots;
}

function imageItem(src: string): { id: string; cols: number; rows: number } {
	const image = bentoImages.find((entry) => entry.src === src);
	if (!image) throw new Error(`bento: missing ${src}`);
	const span = BENTO_RATIO[image.ratio];
	return { id: src, cols: span.cols, rows: span.rows };
}

export function loadBentoTiles(): BentoTile[] {
	const base = pack(2, [
		imageItem(NOW),
		imageItem(ANILIST),
		imageItem(LIBRARY),
		imageItem(TORRENTS),
		imageItem(SHARING),
		imageItem(CHANGELOG),
		imageItem(SQUARE_A),
		imageItem(SQUARE_B),
	]);
	const sm = pack(3, [
		imageItem(NOW),
		imageItem(TORRENTS),
		imageItem(ANILIST),
		imageItem(SHARING),
		imageItem(LIBRARY),
		imageItem(CHANGELOG),
		imageItem(SQUARE_B),
		imageItem(SQUARE_A),
	]);
	const lg = pack(4, [
		imageItem(NOW),
		imageItem(ANILIST),
		imageItem(LIBRARY),
		imageItem(SQUARE_B),
		imageItem(TORRENTS),
		imageItem(SHARING),
		imageItem(CHANGELOG),
		imageItem(SQUARE_A),
	]);

	const tiles: BentoTile[] = [];
	for (const image of bentoImages) {
		tiles.push({
			src: image.src,
			ratio: image.ratio,
			objectPosition: image.objectPosition,
			shot: "shot" in image ? image.shot : null,
			base: base.get(image.src) as Spot,
			sm: sm.get(image.src) as Spot,
			lg: lg.get(image.src) as Spot,
		});
	}
	return tiles;
}

export function bentoPlacementCss(tiles: BentoTile[]): string {
	return tiles
		.map((tile) => {
			const name = tile.src.slice(1);
			const sel = `[data-bento-cell="${name}"]`;
			const box = (spot: Spot): string => `grid-column:${spot.col} / span ${spot.cols};grid-row:${spot.row} / span ${spot.rows}`;
			return `${sel}{${box(tile.base)}}@media (min-width:640px){${sel}{${box(tile.sm)}}}@media (min-width:1024px){${sel}{${box(tile.lg)}}}`;
		})
		.join("");
}
