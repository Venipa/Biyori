export function parseRatio(body: string): { current: number; total: number } | null {
	const matched = /^(\d+)\/(\d+)/.exec(body);
	if (!matched) {
		return null;
	}
	const total = Number(matched[2]);
	if (total <= 0) {
		return null;
	}
	return { current: Number(matched[1]), total };
}

export function splashSegmentState(input: {
	bootBody?: string;
	scanTitle?: string;
	scanBody?: string;
}): { completed: number; total: number; inner: number | null } {
	const bootRatio = input.bootBody ? parseRatio(input.bootBody) : null;
	const innerRatio = input.scanBody ? parseRatio(input.scanBody) : null;
	const scanning = Boolean(input.scanTitle || input.scanBody);
	const total = Math.max(1, bootRatio?.total ?? (scanning ? 2 : 1));
	const done = bootRatio != null && bootRatio.current >= total;
	const matching = Boolean(input.scanTitle === "Matching titles" || innerRatio);
	const inner = innerRatio ? Math.min(100, Math.round((innerRatio.current / innerRatio.total) * 100)) : null;
	if (done) {
		return { completed: total, total, inner: null };
	}
	if (matching) {
		return { completed: Math.min(1, total - 1), total, inner };
	}
	return { completed: Math.min(bootRatio?.current ?? 0, total), total, inner: null };
}
