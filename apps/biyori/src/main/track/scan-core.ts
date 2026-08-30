import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { parseFilename, parsePath, recognizePath, type TitleCandidate } from "@biyori/recognition";

export type ScanCandidate = TitleCandidate;

export type ScanHit = {
	path: string;
	animeId: number;
	episode: number;
	size: number;
};

export type ScanInput = {
	roots: string[];
	threshold: number;
	candidates: ScanCandidate[];
	signal?: AbortSignal;
};

export type ScanResult = {
	files: number;
	scannedRoots: string[];
	hits: ScanHit[];
};

export type FindEpisodeInput = {
	folder: string;
	episode: number;
	threshold: number;
	signal?: AbortSignal;
};

const VIDEO_EXT = new Set([".mkv", ".mp4", ".avi", ".webm", ".mov", ".wmv", ".flv", ".ts", ".m2ts", ".mpg", ".mpeg"]);

function throwIfAborted(signal?: AbortSignal): void {
	if (!signal?.aborted) {
		return;
	}
	const error = new Error("Aborted");
	error.name = "AbortError";
	throw error;
}

function collectFiles(root: string, threshold: number, out: string[], signal?: AbortSignal): boolean {
	throwIfAborted(signal);
	let entries: string[] = [];
	try {
		entries = readdirSync(root);
	} catch {
		return false;
	}
	for (const name of entries) {
		throwIfAborted(signal);
		const full = join(root, name);
		let fileStat: ReturnType<typeof statSync>;
		try {
			fileStat = statSync(full);
		} catch {
			continue;
		}
		if (fileStat.isDirectory()) {
			collectFiles(full, threshold, out, signal);
			continue;
		}
		if (!VIDEO_EXT.has(extname(full).toLowerCase())) {
			continue;
		}
		if (fileStat.size < threshold) {
			continue;
		}
		out.push(full);
	}
	return true;
}

function episodeInRange(
	parsed: { episode: number | null; episodeLow: number | null; episodeHigh: number | null },
	episode: number,
): boolean {
	const low = parsed.episodeLow ?? parsed.episode;
	const high = parsed.episodeHigh ?? parsed.episode;
	if (low == null || high == null) {
		return false;
	}
	return episode >= low && episode <= high;
}

export function scanLibraryRoots(input: ScanInput): ScanResult {
	const files: string[] = [];
	const scannedRoots: string[] = [];
	for (const root of input.roots) {
		throwIfAborted(input.signal);
		if (!existsSync(root)) {
			continue;
		}
		if (collectFiles(root, input.threshold, files, input.signal)) {
			scannedRoots.push(root);
		}
	}
	const hits: ScanHit[] = [];
	for (const path of files) {
		throwIfAborted(input.signal);
		const recognized = recognizePath(path, input.candidates);
		if (!recognized?.match) {
			continue;
		}
		let size = 0;
		try {
			size = statSync(path).size;
		} catch {
			continue;
		}
		hits.push({
			path,
			animeId: recognized.match.id,
			episode: recognized.parsed.episode ?? 1,
			size,
		});
	}
	return { files: files.length, scannedRoots, hits };
}

export function findEpisodeInFolder(input: FindEpisodeInput): string | null {
	if (!input.folder || !existsSync(input.folder)) {
		return null;
	}
	const files: string[] = [];
	collectFiles(input.folder, input.threshold, files, input.signal);
	for (const path of files) {
		throwIfAborted(input.signal);
		const parsed = parsePath(path) ?? parseFilename(basename(path));
		if (parsed && episodeInRange(parsed, input.episode)) {
			return path;
		}
	}
	return null;
}
