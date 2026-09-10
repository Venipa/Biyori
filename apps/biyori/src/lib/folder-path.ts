export function normalizeFolderPath(path: string): string {
	const trimmed = path.trim();
	if (trimmed.length === 0) {
		return "";
	}
	if (/^[a-zA-Z]:[\\/]$/.test(trimmed) || trimmed === "/") {
		return trimmed;
	}
	return trimmed.replace(/[\\/]+$/, "");
}

function foldPath(path: string): string {
	return normalizeFolderPath(path).replaceAll("/", "\\").toLowerCase();
}

export function sameFolderPath(left: string, right: string): boolean {
	return foldPath(left) === foldPath(right);
}

export function folderPathExists(folders: ReadonlyArray<{ path: string }>, path: string): boolean {
	return folders.some((folder) => sameFolderPath(folder.path, path));
}

export function folderDisplayName(path: string): string {
	const normalized = normalizeFolderPath(path);
	const parts = normalized.split(/[\\/]/).filter(Boolean);
	return parts.at(-1) ?? normalized;
}

export function isPathInsideFolder(filePath: string, folderPath: string): boolean {
	const file = foldPath(filePath);
	const folder = foldPath(folderPath);
	if (file === folder) {
		return true;
	}
	const prefix = folder.endsWith("\\") ? folder : `${folder}\\`;
	return file.startsWith(prefix);
}

/** Longest library root that contains the path. Nested roots win. */
export function longestContainingFolder(filePath: string, folders: readonly string[]): string | null {
	let best: string | null = null;
	let bestLen = -1;
	for (const folder of folders) {
		if (!isPathInsideFolder(filePath, folder)) {
			continue;
		}
		const len = foldPath(folder).length;
		if (len > bestLen) {
			best = folder;
			bestLen = len;
		}
	}
	return best;
}
