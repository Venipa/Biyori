export function splitTitleList(value: string | null | undefined): string[] {
	if (!value) {
		return [];
	}
	const seen = new Set<string>();
	const titles: string[] = [];
	for (const part of value.split(/[,;]/)) {
		const title = part.trim();
		if (!title) {
			continue;
		}
		const key = title.toLowerCase();
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		titles.push(title);
	}
	return titles;
}

export function joinTitleList(titles: string[]): string {
	return splitTitleList(titles.join("; ")).join("; ");
}
