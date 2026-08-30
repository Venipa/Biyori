export function pathUnderRoot(filePath: string, root: string): boolean {
	if (!root) {
		return false;
	}
	const file = filePath.replaceAll("\\", "/").toLowerCase();
	const folder = root.replaceAll("\\", "/").toLowerCase().replace(/\/+$/, "");
	return Boolean(folder) && (file === folder || file.startsWith(`${folder}/`));
}

export function candidatesInFolder<T extends { folder?: string }>(filePath: string, candidates: T[]): T[] {
	let longest = 0;
	const hits: T[] = [];
	for (const candidate of candidates) {
		if (!candidate.folder || !pathUnderRoot(filePath, candidate.folder)) {
			continue;
		}
		const length = candidate.folder.length;
		if (length > longest) {
			longest = length;
			hits.length = 0;
			hits.push(candidate);
		} else if (length === longest) {
			hits.push(candidate);
		}
	}
	return hits.length > 0 ? hits : candidates;
}
