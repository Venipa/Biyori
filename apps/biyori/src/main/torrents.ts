import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { asc, count, inArray } from "drizzle-orm";
import { shell } from "electron";
import type { AppSettings } from "../lib/schemas/app-settings";
import { fillTorrentSearchUrl } from "../lib/torrent-feeds";
import type { DatabaseClient } from "./db";
import { episodeFile, torrentArchive } from "./db/schema";
import { trackedFetch } from "./http-stats";
import { appFeedDir } from "./lib/app-paths";
import { pushNotice } from "./activity";
import { setAppNotice } from "./notice";
import { loadAppSettings, loadTorrentFiltersFile, patchTorrentFiltersFile, subscribeFilters, subscribeSettings } from "./settings";
import {
	addDiscardAnimeFilter,
	applyArchiveFilter,
	applyTorrentFilters,
	compareTorrentState,
	setFansubFilter,
	type TorrentFilterItem,
	type TorrentFilterSubject,
} from "./torrents/filter";
import { getTorrentParseWorker } from "./torrents/parse-client";
import type { ParsedTorrentRow } from "./torrents/parse-worker";
import { parseRssItems } from "./torrents/rss";
import { isTorrentPayload } from "./torrents/torrent-payload";
import { loadCandidates, matchById } from "./track/match";
import type { MatchedAnime } from "./track/types";

export type TorrentItem = {
	guid: string;
	title: string;
	link: string;
	infoLink: string;
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
	state: TorrentFilterItem["state"];
	newEpisode: boolean;
};

export { parseRssItems };

const TORRENT_CHECK_DELAY_MS = 4000;

let db: DatabaseClient | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let firstCheckTimer: ReturnType<typeof setTimeout> | null = null;
let items: TorrentItem[] = [];
const discardedGuids = new Set<string>();
const torrentListeners = new Set<(next: TorrentItem[]) => void>();

type FeedCache = {
	rows: ParsedTorrentRow[];
	available: Set<string>;
	seenByGuid: Map<string, string>;
	archivedTitles: Set<string>;
};

let feedCache: FeedCache | null = null;

function emitTorrentItems(): TorrentItem[] {
	const next = getTorrentItems();
	for (const listener of torrentListeners) {
		listener(next);
	}
	return next;
}

export function subscribeTorrentItems(listener: (next: TorrentItem[]) => void): () => void {
	torrentListeners.add(listener);
	return () => {
		torrentListeners.delete(listener);
	};
}

function availableKey(animeId: number, episode: number): string {
	return `${animeId}:${episode}`;
}

async function loadAvailableEpisodes(database: DatabaseClient): Promise<Set<string>> {
	const rows = await database
		.select({
			animeId: episodeFile.animeId,
			episode: episodeFile.episode,
		})
		.from(episodeFile);
	return new Set(rows.map((row) => availableKey(row.animeId, row.episode)));
}

function toSubject(row: ParsedTorrentRow, available: Set<string>): TorrentFilterSubject {
	const match = row.match;
	const episodeHigh = row.episodeHigh ?? row.episode ?? 0;
	const episodeLow = row.episodeLow ?? episodeHigh;
	return {
		title: row.entry.title,
		category: row.category || row.entry.category || "Anime",
		description: row.entry.description,
		link: row.entry.link,
		fileSizeBytes: row.entry.fileSizeBytes,
		animeId: match?.id ?? null,
		animeTitle: match?.title || row.parsedTitle || row.entry.title,
		dateStart: "",
		dateEnd: "",
		episodes: match?.episodes ?? 0,
		airingStatus: match?.airingStatus ?? "",
		type: match?.type ?? "",
		notes: match?.notes ?? "",
		userStatus: match?.status ?? "Not in list",
		episodeHigh,
		episodeLow,
		releaseVersion: row.releaseVersion,
		episodeAvailable: match != null && episodeHigh > 0 && available.has(availableKey(match.id, episodeHigh)),
		group: row.group,
		videoResolution: row.videoResolution,
		videoTerms: row.videoTerms,
		watched: match?.episodesWatched ?? 0,
	};
}

function toTorrentItem(row: ParsedTorrentRow, seenAt: string, state: TorrentItem["state"], newEpisode: boolean): TorrentItem {
	const match = row.match;
	return {
		guid: row.entry.guid,
		title: row.entry.title,
		link: row.entry.link,
		infoLink: row.entry.infoLink,
		matched: Boolean(match),
		seenAt,
		animeId: match?.id ?? null,
		animeTitle: match?.title || row.parsedTitle || row.entry.title,
		airingStatus: match?.airingStatus ?? "",
		episode: row.episode,
		group: row.group,
		size: row.entry.size,
		videoFormat: row.videoFormat,
		seeders: row.entry.seeders,
		leechers: row.entry.leechers,
		downloads: row.entry.downloads,
		description: row.entry.description,
		filename: row.filename,
		pubDate: row.entry.pubDate,
		state,
		newEpisode,
	};
}

export function getTorrentItems(): TorrentItem[] {
	return items.filter((item) => !discardedGuids.has(item.guid) && item.state !== "discarded_hidden");
}

function materializeItems(): TorrentItem[] {
	const cache = feedCache;
	if (!cache) {
		items = [];
		return emitTorrentItems();
	}
	const file = loadTorrentFiltersFile();
	const filterItems: TorrentFilterItem[] = cache.rows.map((row) => ({
		id: row.entry.guid,
		state: "blank",
		subject: toSubject(row, cache.available),
	}));
	applyTorrentFilters(filterItems, file.filters, file.enabled);
	applyArchiveFilter(filterItems, cache.archivedTitles);
	const byGuid = new Map(filterItems.map((item) => [item.id, item]));
	const next: TorrentItem[] = [];
	for (const row of cache.rows) {
		const filtered = byGuid.get(row.entry.guid);
		const state = filtered?.state ?? "blank";
		const watched = row.match?.episodesWatched ?? 0;
		const episodeHigh = row.episodeHigh ?? row.episode ?? 0;
		const newEpisode = Boolean(row.match) && episodeHigh > watched;
		const seenAt = cache.seenByGuid.get(row.entry.guid) ?? new Date().toISOString();
		next.push(toTorrentItem(row, seenAt, state, newEpisode));
	}
	next.sort((left, right) => compareTorrentState(left.state, right.state));
	items = next;
	return emitTorrentItems();
}

export async function applyTorrentView(database: DatabaseClient = requiredDb()): Promise<TorrentItem[]> {
	if (feedCache) {
		feedCache.available = await loadAvailableEpisodes(database);
	}
	return materializeItems();
}

export function sortDownloadQueue(rows: TorrentItem[], settings: AppSettings): TorrentItem[] {
	const dir = settings.torrentDownloadSortOrder === "descending" ? -1 : 1;
	return [...rows].sort((left, right) => {
		const leftId = left.animeId ?? Number.MAX_SAFE_INTEGER;
		const rightId = right.animeId ?? Number.MAX_SAFE_INTEGER;
		if (leftId !== rightId) {
			return leftId - rightId;
		}
		if (settings.torrentDownloadSortBy === "release_date") {
			return left.pubDate.localeCompare(right.pubDate) * dir;
		}
		return ((left.episode ?? 0) - (right.episode ?? 0)) * dir;
	});
}

function safeFileStem(value: string): string {
	const cleaned = value.replace(/[<>:"/\\|?*]/g, "_").trim();
	return cleaned.slice(0, 80) || "torrent";
}

async function resolveDownloadDir(settings: AppSettings, title: string, match: MatchedAnime | null): Promise<string> {
	let dir = "";
	if (settings.torrentUseAnimeFolder && match?.folder.trim()) {
		dir = match.folder.trim();
	} else if (settings.torrentFallbackOnFolder || !settings.torrentUseAnimeFolder) {
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

function spawnTorrentClient(link: string, dir: string, settings: AppSettings): boolean {
	if (!settings.torrentAppOpen) {
		return true;
	}
	const custom = settings.torrentAppMode === "custom" && settings.torrentAppPath.trim();
	if (custom) {
		const appPath = settings.torrentAppPath.trim();
		const args = dir ? [appPath, "--save-path", dir, link] : [appPath, link];
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

async function openTorrent(link: string, title: string, settings: AppSettings, match: MatchedAnime | null): Promise<void> {
	const dir = await resolveDownloadDir(settings, title, match);
	const useMagnet = settings.torrentUseMagnet || link.startsWith("magnet:");
	if (dir && useMagnet) {
		await writeFile(join(dir, `${safeFileStem(title)}.magnet`), link, "utf8");
		spawnTorrentClient(link, dir, settings);
		return;
	}
	if (!useMagnet && link.startsWith("http")) {
		const response = await trackedFetch(link, {
			headers: { Accept: "application/x-bittorrent, */*" },
		});
		if (!response.ok) {
			throw new Error(`Torrent download failed (${response.status})`);
		}
		const bytes = Buffer.from(await response.arrayBuffer());
		if (!isTorrentPayload(bytes)) {
			throw new Error("Torrent download returned an invalid payload");
		}
		const folder = appFeedDir();
		await mkdir(folder, { recursive: true });
		const filePath = join(folder, `${safeFileStem(title)}.torrent`);
		await writeFile(filePath, bytes);
		spawnTorrentClient(filePath, dir, settings);
		return;
	}
	spawnTorrentClient(link, dir, settings);
}

async function ingestFeed(database: DatabaseClient, feedUrl: string, force: boolean): Promise<TorrentItem[]> {
	const settings = loadAppSettings();
	const response = await trackedFetch(feedUrl);
	if (!response.ok) {
		throw new Error(`RSS feed failed (${response.status})`);
	}
	const xml = await response.text();
	const candidates = await loadCandidates(database);
	const available = await loadAvailableEpisodes(database);
	const rows = await getTorrentParseWorker().invoke.parseFeed({
		xml,
		candidates,
	});
	const existingArchive = await database
		.select({
			guid: torrentArchive.guid,
			title: torrentArchive.title,
			seenAt: torrentArchive.seenAt,
		})
		.from(torrentArchive);
	const seenByGuid = new Map(existingArchive.map((row) => [row.guid, row.seenAt]));
	const archivedTitles = new Set(existingArchive.map((row) => row.title));
	const bootstrap = existingArchive.length === 0;
	const now = new Date().toISOString();
	const freshGuids = new Set<string>();
	for (const row of rows) {
		if (!seenByGuid.has(row.entry.guid)) {
			seenByGuid.set(row.entry.guid, now);
			freshGuids.add(row.entry.guid);
		}
	}
	feedCache = {
		rows,
		available,
		seenByGuid,
		archivedTitles,
	};
	const visible = materializeItems();
	const byGuid = new Map(items.map((item) => [item.guid, item]));
	for (const row of rows) {
		if (!freshGuids.has(row.entry.guid)) {
			continue;
		}
		const state = byGuid.get(row.entry.guid)?.state ?? "blank";
		const watched = row.match?.episodesWatched ?? 0;
		const episodeHigh = row.episodeHigh ?? row.episode ?? 0;
		const newEpisode = Boolean(row.match) && episodeHigh > watched;
		const seenAt = seenByGuid.get(row.entry.guid) ?? now;
		const announce = state === "selected" && newEpisode;
		await database.insert(torrentArchive).values({
			guid: row.entry.guid,
			title: row.entry.title,
			link: row.entry.link,
			matched: announce ? 1 : 0,
			seenAt,
		});
		archivedTitles.add(row.entry.title);
		if (announce && !force && !bootstrap) {
			const title = `New torrent: ${row.entry.title}`;
			setAppNotice(title);
			pushNotice({ source: "torrent", title });
			if (settings.newTorrentAction === "download" && row.entry.link) {
				await openTorrent(row.entry.link, row.entry.title, settings, row.match);
			}
		}
	}
	await trimTorrentArchive(database, settings.torrentArchiveMaxCount);
	return visible;
}

async function trimTorrentArchive(database: DatabaseClient, maxCount: number): Promise<void> {
	if (maxCount <= 0) {
		return;
	}
	const [row] = await database.select({ total: count() }).from(torrentArchive);
	const extra = (row?.total ?? 0) - maxCount;
	if (extra <= 0) {
		return;
	}
	const oldest = await database.select({ guid: torrentArchive.guid }).from(torrentArchive).orderBy(asc(torrentArchive.seenAt)).limit(extra);
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

export async function checkTorrents(database: DatabaseClient = requiredDb(), force = false, feedUrl?: string): Promise<TorrentItem[]> {
	const settings = loadAppSettings();
	const url = (feedUrl ?? settings.rssFeedUrl).trim();
	if (!url) {
		feedCache = null;
		items = [];
		return emitTorrentItems();
	}
	return ingestFeed(database, url, force);
}

export async function searchTorrents(title: string, database: DatabaseClient = requiredDb()): Promise<TorrentItem[]> {
	const settings = loadAppSettings();
	const template = settings.rssSearchUrl.trim() || settings.rssFeedUrl.trim();
	if (!template) {
		return getTorrentItems();
	}
	return checkTorrents(database, true, fillTorrentSearchUrl(template, title));
}

export async function downloadTorrent(guid: string, database: DatabaseClient = requiredDb()): Promise<void> {
	const item = items.find((row) => row.guid === guid);
	if (!item?.link) {
		return;
	}
	const settings = loadAppSettings();
	const candidates = await loadCandidates(database);
	const match = item.animeId ? matchById(item.animeId, candidates) : null;
	await openTorrent(item.link, item.title, settings, match);
}

export async function downloadSelectedTorrents(guids: string[], database: DatabaseClient = requiredDb()): Promise<void> {
	const settings = loadAppSettings();
	const selected = sortDownloadQueue(
		items.filter((item) => guids.includes(item.guid)),
		settings,
	);
	for (const item of selected) {
		await downloadTorrent(item.guid, database);
	}
}

export function discardTorrent(guid: string): TorrentItem[] {
	discardedGuids.add(guid);
	return emitTorrentItems();
}

export async function discardAnimeFilter(animeId: number, title: string, database: DatabaseClient = requiredDb()): Promise<TorrentItem[]> {
	const file = loadTorrentFiltersFile();
	patchTorrentFiltersFile({
		filters: addDiscardAnimeFilter(file.filters, animeId, title),
	});
	return applyTorrentView(database);
}

export async function preferFansubFilter(animeId: number, group: string, title: string, database: DatabaseClient = requiredDb()): Promise<TorrentItem[]> {
	const file = loadTorrentFiltersFile();
	patchTorrentFiltersFile({
		filters: setFansubFilter(file.filters, animeId, group, title),
	});
	return applyTorrentView(database);
}

export function initTorrents(database: DatabaseClient): void {
	db = database;
	void restartTorrentPoll();
	const refreshView = (): void => {
		void applyTorrentView(database).catch(() => {
			/* ignore */
		});
	};
	subscribeSettings(() => {
		refreshView();
		void restartTorrentPoll();
	});
	subscribeFilters(refreshView);
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
	const settings = loadAppSettings();
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
		pollTimer = setInterval(
			() => {
				if (db) {
					void checkTorrents(db).catch(() => {
						/* ignore */
					});
				}
			},
			Math.max(10, settings.torrentCheckIntervalMinutes) * 60 * 1000,
		);
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
