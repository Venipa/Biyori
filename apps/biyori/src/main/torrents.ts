import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { asc, count, inArray } from "drizzle-orm";
import { shell } from "electron";
import type { AppSettings } from "../lib/schemas/app-settings";
import { fillTorrentSearchUrl } from "../lib/torrent-feeds";
import type { DatabaseClient } from "./db";
import { torrentArchive } from "./db/schema";
import { loadAppSettings, patchAppSettings, subscribeSettings } from "./settings";
import { loadCandidates, matchById } from "./track/match";
import type { MatchedAnime } from "./track/types";
import { setAppNotice } from "./notice";
import { getTorrentParseWorker } from "./torrents/parse-client";
import type { ParsedTorrentRow } from "./torrents/parse-worker";
import { parseRssItems } from "./torrents/rss";

export type TorrentItem = {
	guid: string;
	title: string;
	link: string;
	matched: boolean;
	seenAt: string;
	animeId: number | null;
	animeTitle: string;
	airingStatus: string;
	episode: number | null;
	group: string;
	size: string;
	videoFormat: string;
	seeders: number | null;
	leechers: number | null;
	downloads: number | null;
	description: string;
	filename: string;
	pubDate: string;
};

export { parseRssItems };

const TORRENT_CHECK_DELAY_MS = 4000;

let db: DatabaseClient | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let firstCheckTimer: ReturnType<typeof setTimeout> | null = null;
let items: TorrentItem[] = [];
const discardedGuids = new Set<string>();

function groupsMatch(preferred: string, group: string): boolean {
	const left = preferred.trim().toLowerCase();
	const right = group.trim().toLowerCase();
	if (!left || !right) {
		return false;
	}
	return left === right || left.includes(right) || right.includes(left);
}

function shouldAnnounceTorrent(
	match: MatchedAnime | null,
	group: string,
	settings: AppSettings,
): boolean {
	if (!match) {
		return false;
	}
	if (!settings.torrentFilterEnabled) {
		return true;
	}
	if (settings.torrentDiscardAnimeIds.includes(match.id)) {
		return false;
	}
	if (
		settings.torrentWatchingOnly &&
		match.status !== "Currently watching" &&
		match.status !== "Plan to watch"
	) {
		return false;
	}
	const fansub = match.fansub.trim();
	if (fansub && !groupsMatch(fansub, group)) {
		return false;
	}
	return true;
}

function safeFileStem(value: string): string {
	const cleaned = value.replace(/[<>:"/\\|?*]/g, "_").trim();
	return cleaned.slice(0, 80) || "torrent";
}

async function resolveDownloadDir(
	settings: AppSettings,
	title: string,
	match: MatchedAnime | null,
): Promise<string> {
	let dir = "";
	if (settings.torrentUseAnimeFolder && match?.folder.trim()) {
		dir = match.folder.trim();
	} else if (
		settings.torrentFallbackOnFolder ||
		!settings.torrentUseAnimeFolder
	) {
		dir = settings.torrentDownloadDir.trim();
	}
	if (dir && settings.torrentCreateSubfolder) {
		dir = join(dir, safeFileStem(match?.title || title));
	}
	const fileDir = settings.torrentFileDownloadPath.trim() || dir;
	if (fileDir) {
		await mkdir(fileDir, { recursive: true });
	}
	return fileDir;
}

function spawnTorrentClient(
	link: string,
	dir: string,
	settings: AppSettings,
): boolean {
	if (!settings.torrentAppOpen) {
		return true;
	}
	const custom =
		settings.torrentAppMode === "custom" && settings.torrentAppPath.trim();
	if (custom) {
		const appPath = settings.torrentAppPath.trim();
		const args = dir
			? [appPath, "--save-path", dir, link]
			: [appPath, link];
		spawn(args[0], args.slice(1), {
			stdio: "ignore",
			detached: true,
			windowsHide: true,
		}).unref();
		return true;
	}
	void shell.openExternal(link);
	return true;
}

async function openTorrent(
	link: string,
	title: string,
	settings: AppSettings,
	match: MatchedAnime | null,
): Promise<void> {
	const dir = await resolveDownloadDir(settings, title, match);
	const useMagnet = settings.torrentUseMagnet || link.startsWith("magnet:");
	if (dir && useMagnet) {
		await writeFile(join(dir, `${safeFileStem(title)}.magnet`), link, "utf8");
	}
	spawnTorrentClient(link, dir, settings);
}

function toTorrentItem(row: ParsedTorrentRow, seenAt: string): TorrentItem {
	const { entry, match } = row;
	return {
		guid: entry.guid,
		title: entry.title,
		link: entry.link,
		matched: Boolean(match),
		seenAt,
		animeId: match?.id ?? null,
		animeTitle: match?.title || row.parsedTitle || entry.title,
		airingStatus: match?.airingStatus ?? "",
		episode: row.episode,
		group: row.group,
		size: entry.size,
		videoFormat: row.videoFormat,
		seeders: entry.seeders,
		leechers: entry.leechers,
		downloads: entry.downloads,
		description: entry.description,
		filename: row.filename,
		pubDate: entry.pubDate,
	};
}

export function getTorrentItems(): TorrentItem[] {
	return items.filter((item) => !discardedGuids.has(item.guid));
}

function sortTorrentItems(
	rows: TorrentItem[],
	settings: AppSettings,
): TorrentItem[] {
	const copy = [...rows];
	const dir = settings.torrentDownloadSortOrder === "descending" ? -1 : 1;
	copy.sort((left, right) => {
		if (settings.torrentDownloadSortBy === "release_date") {
			return left.pubDate.localeCompare(right.pubDate) * dir;
		}
		return ((left.episode ?? 0) - (right.episode ?? 0)) * dir;
	});
	return copy;
}

async function ingestFeed(
	database: DatabaseClient,
	feedUrl: string,
	force: boolean,
): Promise<TorrentItem[]> {
	const settings = await loadAppSettings(database);
	const response = await fetch(feedUrl);
	if (!response.ok) {
		throw new Error(`RSS feed failed (${response.status})`);
	}
	const xml = await response.text();
	const candidates = await loadCandidates(database);
	const rows = await getTorrentParseWorker().invoke.parseFeed({
		xml,
		candidates,
	});
	const existingArchive = await database
		.select({ guid: torrentArchive.guid, seenAt: torrentArchive.seenAt })
		.from(torrentArchive);
	const seenByGuid = new Map(
		existingArchive.map((row) => [row.guid, row.seenAt]),
	);
	const bootstrap = existingArchive.length === 0;
	const next: TorrentItem[] = [];
	for (const row of rows) {
		const { entry, match, group } = row;
		const archivedAt = seenByGuid.get(entry.guid);
		const seenAt = archivedAt ?? new Date().toISOString();
		const announce =
			Boolean(match) && shouldAnnounceTorrent(match, group, settings);
		if (archivedAt == null) {
			await database.insert(torrentArchive).values({
				guid: entry.guid,
				title: entry.title,
				link: entry.link,
				matched: announce ? 1 : 0,
				seenAt,
			});
			seenByGuid.set(entry.guid, seenAt);
			if (announce && !force && !bootstrap) {
				setAppNotice(`New torrent: ${entry.title}`);
				if (settings.newTorrentAction === "download" && entry.link) {
					await openTorrent(entry.link, entry.title, settings, match);
				}
			}
		}
		if (
			match &&
			settings.torrentFilterEnabled &&
			settings.torrentDiscardAnimeIds.includes(match.id)
		) {
			discardedGuids.add(entry.guid);
		}
		next.push(toTorrentItem(row, seenAt));
	}
	await trimTorrentArchive(database, settings.torrentArchiveMaxCount);
	return sortTorrentItems(next, settings);
}

async function trimTorrentArchive(
	database: DatabaseClient,
	maxCount: number,
): Promise<void> {
	if (maxCount <= 0) {
		return;
	}
	const [row] = await database
		.select({ total: count() })
		.from(torrentArchive);
	const extra = (row?.total ?? 0) - maxCount;
	if (extra <= 0) {
		return;
	}
	const oldest = await database
		.select({ guid: torrentArchive.guid })
		.from(torrentArchive)
		.orderBy(asc(torrentArchive.seenAt))
		.limit(extra);
	if (oldest.length === 0) {
		return;
	}
	await database.delete(torrentArchive).where(
		inArray(
			torrentArchive.guid,
			oldest.map((item) => item.guid),
		),
	);
}

export async function checkTorrents(
	database: DatabaseClient = requiredDb(),
	force = false,
	feedUrl?: string,
): Promise<TorrentItem[]> {
	const settings = await loadAppSettings(database);
	const url = (feedUrl ?? settings.rssFeedUrl).trim();
	if (!url) {
		items = [];
		return items;
	}
	items = await ingestFeed(database, url, force);
	return getTorrentItems();
}

export async function searchTorrents(
	title: string,
	database: DatabaseClient = requiredDb(),
): Promise<TorrentItem[]> {
	const settings = await loadAppSettings(database);
	const template = settings.rssSearchUrl.trim() || settings.rssFeedUrl.trim();
	if (!template) {
		return getTorrentItems();
	}
	return checkTorrents(database, true, fillTorrentSearchUrl(template, title));
}

export async function downloadTorrent(
	guid: string,
	database: DatabaseClient = requiredDb(),
): Promise<void> {
	const item = items.find((row) => row.guid === guid);
	if (!item?.link) {
		return;
	}
	const settings = await loadAppSettings(database);
	const candidates = await loadCandidates(database);
	const match = item.animeId ? matchById(item.animeId, candidates) : null;
	await openTorrent(item.link, item.title, settings, match);
}

export function discardTorrent(guid: string): TorrentItem[] {
	discardedGuids.add(guid);
	return getTorrentItems();
}

export function discardTorrentsForAnime(animeId: number): TorrentItem[] {
	for (const item of items) {
		if (item.animeId === animeId) {
			discardedGuids.add(item.guid);
		}
	}
	return getTorrentItems();
}

export async function discardAnimeFilter(
	animeId: number,
	database: DatabaseClient = requiredDb(),
): Promise<TorrentItem[]> {
	const settings = await loadAppSettings(database);
	if (!settings.torrentDiscardAnimeIds.includes(animeId)) {
		await patchAppSettings(database, {
			torrentDiscardAnimeIds: [...settings.torrentDiscardAnimeIds, animeId],
		});
	}
	return discardTorrentsForAnime(animeId);
}

export function initTorrents(database: DatabaseClient): void {
	db = database;
	void restartTorrentPoll();
	subscribeSettings(() => {
		void restartTorrentPoll();
	});
}

export async function restartTorrentPoll(): Promise<void> {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
	if (firstCheckTimer) {
		clearTimeout(firstCheckTimer);
		firstCheckTimer = null;
	}
	if (!db) {
		return;
	}
	const settings = await loadAppSettings(db);
	if (!settings.checkTorrentsAutomatically || !settings.rssFeedUrl) {
		return;
	}
	const startPoll = (): void => {
		if (!db) {
			return;
		}
		void checkTorrents(db).catch(() => {
			/* ignore poll errors */
		});
		pollTimer = setInterval(() => {
			if (db) {
				void checkTorrents(db).catch(() => {
					/* ignore */
				});
			}
		}, Math.max(10, settings.torrentCheckIntervalMinutes) * 60 * 1000);
	};
	firstCheckTimer = setTimeout(() => {
		firstCheckTimer = null;
		startPoll();
	}, TORRENT_CHECK_DELAY_MS);
}

function requiredDb(): DatabaseClient {
	if (!db) {
		throw new Error("Torrents database is not initialized");
	}
	return db;
}
