export function estimateEpisodeCount(knownTotal: number, lastKnown: number): number {
	if (knownTotal > 0) {
		return knownTotal;
	}
	if (lastKnown < 12) {
		return 12;
	}
	if (lastKnown < 24) {
		return 26;
	}
	if (lastKnown < 50) {
		return 52;
	}
	return 0;
}

export function lastEpisodeNumber(input: {
	total: number;
	watched: number;
	available: number;
	aired: number;
	finished: boolean;
}): number {
	if (input.finished) {
		return input.total;
	}
	let last = input.watched;
	if (input.available !== input.total) {
		last = Math.max(last, input.available);
	}
	return Math.max(last, input.aired);
}

export type ListProgressLayout = {
	watched: number;
	aired: number;
	availableStart: number;
	availableEnd: number;
};

export function listProgressLayout(input: {
	watched: number;
	total: number;
	available: number;
	aired: number;
	finished: boolean;
}): ListProgressLayout {
	const last = lastEpisodeNumber(input);
	const estimated = estimateEpisodeCount(input.total, last);
	let aired = 0;
	let watched = 0;
	if (estimated > 0) {
		if (last > 0) {
			aired = last / estimated;
		}
		if (input.watched > 0) {
			watched = input.watched / estimated;
		}
	} else {
		if (last > 0) {
			aired = last > input.watched ? 0.85 : 0.8;
		}
		if (input.watched > 0 && last > 0) {
			watched = Math.min(0.8, (0.8 * input.watched) / last);
		}
	}
	aired = Math.min(aired, 1);
	watched = Math.min(watched, 1);

	let availableStart = 0;
	let availableEnd = 0;
	if (estimated > 0 && input.available > 0) {
		availableEnd = Math.min(input.available / estimated, 1);
	} else if (estimated === 0 && aired === 0.85 && input.available > input.watched) {
		availableStart = watched;
		availableEnd = 0.825;
	}

	return { watched, aired, availableStart, availableEnd };
}

export function listProgressRatio(watched: number, total: number): number {
	return listProgressLayout({
		watched,
		total,
		available: 0,
		aired: 0,
		finished: false,
	}).watched;
}

export function collapseEpisodeRanges(episodes: number[]): Array<[number, number]> {
	const sorted = [...episodes].sort((left, right) => left - right);
	const ranges: Array<[number, number]> = [];
	for (const episode of sorted) {
		const current = ranges.at(-1);
		if (!current) {
			ranges.push([episode, episode]);
			continue;
		}
		if (current[1] === episode - 1) {
			current[1] = episode;
			continue;
		}
		ranges.push([episode, episode]);
	}
	return ranges;
}

export function libraryEpisodeTooltip(input: {
	watched: number;
	total: number;
	aired: number;
	finished: boolean;
	libraryEpisodes?: number[];
}): string {
	const libraryEpisodes = input.libraryEpisodes ?? [];
	const have = new Set(libraryEpisodes);
	const maxLibrary = libraryEpisodes.length > 0 ? Math.max(...libraryEpisodes) : 0;
	const lastAired = lastEpisodeNumber({
		watched: input.watched,
		total: input.total,
		available: maxLibrary,
		aired: input.aired,
		finished: input.finished,
	});
	const scanUntil = Math.max(lastAired, maxLibrary, 0);
	const missing: number[] = [];
	for (let episode = 1; episode <= scanUntil; episode += 1) {
		if (!have.has(episode)) {
			missing.push(episode);
		}
	}
	const lines: string[] = [];
	if (scanUntil <= 0 || missing.length === scanUntil) {
		lines.push("All episodes are missing");
	} else if (missing.length === 0) {
		lines.push("All episodes are in library folders");
	} else {
		const missingText = collapseEpisodeRanges(missing)
			.map(([from, to]) => (to > from ? `#${from}-${to}` : `#${from}`))
			.join(", ");
		lines.push(`Missing: ${missingText}`);
	}
	if (!input.finished && lastAired > input.watched) {
		lines.push(`Aired: #${lastAired} (estimated)`);
	}
	return lines.join("\n");
}

export function listProgressLabel(watched: number, total: number): { watched: string; total: string } {
	const capped = total > 0 ? Math.min(Math.max(watched, 0), total) : Math.max(watched, 0);
	return {
		watched: String(capped),
		total: total > 0 ? String(total) : "?",
	};
}
