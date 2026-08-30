import semver from "semver";

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

export const UPDATE_CHANNEL_LABELS: Record<UpdateChannel, string> = {
	stable: "Stable",
	beta: "Beta",
	alpha: "Alpha",
};

const allowedChannels = Object.keys(UPDATE_CHANNEL_LABELS) as UpdateChannel[];

export function cleanSemver(version: string): string | null {
	return semver.clean(version.replace(/^v/i, ""), { loose: true });
}

/**
 * Classify a semver version into a release channel.
 * - stable: no prerelease
 * - beta: `-rc.<n>`
 * - alpha: `-a.<n>` or `-alpha.<n>`
 */
export function getVersionChannel(version: string): UpdateChannel | null {
	const cleaned = cleanSemver(version);
	if (!cleaned) {
		return null;
	}
	const pre = semver.prerelease(cleaned, { loose: true });
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
	if (!kind) {
		return false;
	}
	if (channel === "stable") {
		return kind === "stable";
	}
	if (channel === "beta") {
		return kind === "beta" || kind === "stable";
	}
	return allowedChannels.includes(kind);
}

export function parseUpdateChannel(value: unknown): UpdateChannel {
	if (value === "rc" || value === "canary") {
		return "beta";
	}
	if (allowedChannels.includes(value as UpdateChannel)) {
		return value as UpdateChannel;
	}
	return "stable";
}

export function electronUpdaterChannelFor(channel: UpdateChannel): string {
	if (channel === "beta") {
		return "rc";
	}
	if (channel === "alpha") {
		return "alpha";
	}
	return "latest";
}

export function channelWantsPrerelease(channel: UpdateChannel): boolean {
	return channel !== "stable";
}
