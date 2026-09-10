import { folderDisplayName, longestContainingFolder } from "./folder-path";

export type LibraryFileStat = {
	path: string;
	animeId: number;
	episode: number;
	size: number;
};

export type LibrarySeriesFolder = {
	id: number;
	folder: string;
};

export type LibraryFolderStatus = "missing" | "empty" | "indexed";

export type LibraryFolderRow = {
	path: string;
	name: string;
	missing: boolean;
	series: number;
	episodes: number;
	files: number;
	bytes: number;
	status: LibraryFolderStatus;
};

export type LibrarySummary = {
	folders: LibraryFolderRow[];
	totals: {
		folders: number;
		series: number;
		episodes: number;
		files: number;
		bytes: number;
	};
	outside: {
		files: number;
		bytes: number;
	};
};

type Bucket = {
	series: Set<number>;
	episodes: Set<string>;
	files: number;
	bytes: number;
};

function folderStatus(missing: boolean, files: number): LibraryFolderStatus {
	if (missing) {
		return "missing";
	}
	if (files <= 0) {
		return "empty";
	}
	return "indexed";
}

export function summarizeLibraryFolders(
	folders: ReadonlyArray<{ path: string; missing: boolean }>,
	files: readonly LibraryFileStat[],
	seriesFolders: readonly LibrarySeriesFolder[],
): LibrarySummary {
	const roots = folders.map((folder) => folder.path);
	const buckets = new Map<string, Bucket>();
	for (const folder of folders) {
		buckets.set(folder.path, { series: new Set(), episodes: new Set(), files: 0, bytes: 0 });
	}

	let outsideFiles = 0;
	let outsideBytes = 0;
	for (const file of files) {
		const root = longestContainingFolder(file.path, roots);
		if (!root) {
			outsideFiles += 1;
			outsideBytes += file.size;
			continue;
		}
		const bucket = buckets.get(root);
		if (!bucket) {
			continue;
		}
		bucket.series.add(file.animeId);
		bucket.episodes.add(`${file.animeId}:${file.episode}`);
		bucket.files += 1;
		bucket.bytes += file.size;
	}

	for (const series of seriesFolders) {
		if (!series.folder) {
			continue;
		}
		const root = longestContainingFolder(series.folder, roots);
		if (!root) {
			continue;
		}
		buckets.get(root)?.series.add(series.id);
	}

	const rows: LibraryFolderRow[] = folders.map((folder) => {
		const bucket = buckets.get(folder.path);
		const fileCount = bucket?.files ?? 0;
		return {
			path: folder.path,
			name: folderDisplayName(folder.path),
			missing: folder.missing,
			series: bucket?.series.size ?? 0,
			episodes: bucket?.episodes.size ?? 0,
			files: fileCount,
			bytes: bucket?.bytes ?? 0,
			status: folderStatus(folder.missing, fileCount),
		};
	});

	const totals = {
		folders: rows.length,
		series: 0,
		episodes: 0,
		files: 0,
		bytes: 0,
	};
	for (const row of rows) {
		totals.series += row.series;
		totals.episodes += row.episodes;
		totals.files += row.files;
		totals.bytes += row.bytes;
	}

	return {
		folders: rows,
		totals,
		outside: { files: outsideFiles, bytes: outsideBytes },
	};
}
