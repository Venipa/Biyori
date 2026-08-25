const UNITS: Record<string, number> = {
	b: 1,
	kb: 1000,
	kib: 1024,
	mb: 1000 ** 2,
	mib: 1024 ** 2,
	gb: 1000 ** 3,
	gib: 1024 ** 3,
	tb: 1000 ** 4,
	tib: 1024 ** 4,
};

export function parseSizeBytes(value: string): number {
	const match = value.trim().match(/^([\d.,]+)\s*([a-z]+)?$/i);
	if (!match) {
		const digits = Number.parseInt(value.replace(/,/g, ""), 10);
		return Number.isFinite(digits) ? digits : 0;
	}
	const amount = Number.parseFloat(match[1].replace(/,/g, ""));
	if (!Number.isFinite(amount)) {
		return 0;
	}
	const unit = (match[2] ?? "b").toLowerCase();
	return Math.round(amount * (UNITS[unit] ?? 1));
}

export function resolutionHeight(value: string): number {
	const pixels = value.match(/(\d+)\s*x\s*(\d+)/i);
	if (pixels) {
		return Number.parseInt(pixels[2], 10);
	}
	const named = value.match(/(\d{3,4})p/i);
	if (named) {
		return Number.parseInt(named[1], 10);
	}
	const raw = Number.parseInt(value, 10);
	return Number.isFinite(raw) ? raw : 0;
}
