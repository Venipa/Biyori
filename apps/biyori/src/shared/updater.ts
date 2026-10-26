import { clean, getPrerelease } from "verkit";

export type ProgressInfo = {
	total: number;
	delta: number;
	transferred: number;
	percent: number;
	bytesPerSecond: number;
};

export function formatTransferRate(bytesPerSecond: number): string {
	if (!Number.isFinite(bytesPerSecond) || bytesPerSecond < 0) {
		return "0 B/s";
	}
	const units = ["B/s", "KB/s", "MB/s", "GB/s"] as const;
	let value = bytesPerSecond;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const digits = unit === 0 ? 0 : value >= 10 ? 0 : 1;
	return `${value.toFixed(digits)} ${units[unit]}`;
}

export type ReleaseNoteEntry = {
	version: string;
	name: string | null;
	body: string | null;
	publishedAt: string | null;
	prerelease: boolean;
};

export type UpdateChannel = "stable" | "beta" | "alpha";

export const UPDATE_CHANNELS: readonly UpdateChannel[] = ["stable", "beta", "alpha"] as const;

// a channel accepts its own releases and every more stable one
const channelRank: Record<UpdateChannel, number> = { stable: 0, beta: 1, alpha: 2 };

export function cleanSemver(version: unknown): string | null {
	if (typeof version !== "string" || version.length === 0) {
		return null;
	}
	return clean(version.replace(/^v/i, ""), { loose: true });
}

/**
 * Classify a semver version into a release channel.
 * - stable: no prerelease
 * - beta: `-rc.<n>`
 * - alpha: `-a.<n>` or `-alpha.<n>`
 */
export function getVersionChannel(version: unknown): UpdateChannel | null {
	const cleaned = cleanSemver(version);
	if (!cleaned) {
		return null;
	}
	const pre = getPrerelease(cleaned, { loose: true });
	if (!pre?.length) {
		return "stable";
	}
	const id = String(pre[0]).toLowerCase();
	if (id === "rc") {
		return "beta";
	}
	if (id === "a" || id === "alpha") {
		return "alpha";
	}
	return null;
}

export function isVersionAllowedOnChannel(version: string, channel: UpdateChannel): boolean {
	const kind = getVersionChannel(version);
	return kind !== null && channelRank[kind] <= channelRank[channel];
}

export function parseUpdateChannel(value: unknown): UpdateChannel {
	if (value === "rc" || value === "canary") {
		return "beta";
	}
	if (UPDATE_CHANNELS.includes(value as UpdateChannel)) {
		return value as UpdateChannel;
	}
	return "stable";
}
