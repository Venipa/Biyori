import { folderDisplayName, isPathInsideFolder, longestContainingFolder, normalizeFolderPath, sameFolderPath } from "./folder-path";

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

export type RootFolderStatus = "matched" | "unmatched" | "ignored" | "multiple";

export type RootFolderOwner = {
	animeId: number;
	title: string;
	coverUrl: string;
	episodes: number;
	onList: boolean;
	viaFolder: boolean;
};

export type RootFolderRow = {
	path: string;
	name: string;
	status: RootFolderStatus;
	episodes: number;
	files: number;
	owners: RootFolderOwner[];
};

export type RootFolders = {
	root: string;
	name: string;
	missing: boolean;
	folders: RootFolderRow[];
};

export type RootFolderAnimeInfo = { title: string; coverUrl: string; episodes: number; onList: boolean };

const STATUS_ORDER: Record<RootFolderStatus, number> = { unmatched: 0, multiple: 1, matched: 2, ignored: 3 };

/** Immediate series folders of a root, each with the anime that owns it (via episode files or anime.folder). */
export function classifyRootFolders(
	subdirs: readonly string[],
	files: readonly LibraryFileStat[],
	animeFolders: readonly LibrarySeriesFolder[],
	ignored: readonly string[],
	info: ReadonlyMap<number, RootFolderAnimeInfo>,
): RootFolderRow[] {
	const fold = (path: string) => normalizeFolderPath(path).replaceAll("\\", "/").toLowerCase();
	const keys = new Set(subdirs.map(fold));
	const byDir = new Map<string, LibraryFileStat[]>();
	for (const file of files) {
		// climb the file path until it hits a subdir; loose files in the root hit nothing
		for (let key = fold(file.path); key; key = key.slice(0, Math.max(0, key.lastIndexOf("/")))) {
			if (keys.has(key)) {
				const list = byDir.get(key);
				if (list) {
					list.push(file);
				} else {
					byDir.set(key, [file]);
				}
				break;
			}
		}
	}
	const idsByFolder = new Map<string, Set<number>>();
	for (const row of animeFolders) {
		if (row.folder) {
			const key = fold(row.folder);
			idsByFolder.set(key, (idsByFolder.get(key) ?? new Set<number>()).add(row.id));
		}
	}
	const rows = subdirs.map((path): RootFolderRow => {
		const episodesById = new Map<number, Set<number>>();
		const inside = byDir.get(fold(path)) ?? [];
		for (const file of inside) {
			const set = episodesById.get(file.animeId) ?? new Set<number>();
			set.add(file.episode);
			episodesById.set(file.animeId, set);
		}
		const viaFolder = idsByFolder.get(fold(path)) ?? new Set<number>();
		const owners = [...new Set([...episodesById.keys(), ...viaFolder])]
			.map((animeId): RootFolderOwner => {
				const known = info.get(animeId);
				return {
					animeId,
					title: known?.title ?? "",
					coverUrl: known?.coverUrl ?? "",
					episodes: episodesById.get(animeId)?.size ?? 0,
					onList: known?.onList ?? false,
					viaFolder: viaFolder.has(animeId),
				};
			})
			.sort((a, b) => b.episodes - a.episodes || a.animeId - b.animeId);
		const isIgnored = ignored.some((entry) => sameFolderPath(entry, path));
		const status: RootFolderStatus = isIgnored ? "ignored" : owners.length === 0 ? "unmatched" : owners.length === 1 ? "matched" : "multiple";
		return {
			path,
			name: folderDisplayName(path),
			status,
			episodes: owners.reduce((sum, owner) => sum + owner.episodes, 0),
			files: inside.length,
			owners,
		};
	});
	return rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name));
}

/** Drops scan hits that sit inside an ignored series folder. */
export function dropIgnoredHits<T extends { path: string }>(hits: readonly T[], ignored: readonly string[]): T[] {
	if (ignored.length === 0) {
		return [...hits];
	}
	return hits.filter((hit) => !ignored.some((folder) => isPathInsideFolder(hit.path, folder)));
}
