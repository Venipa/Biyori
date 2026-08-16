import { is } from "@electron-toolkit/utils";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { appDatabasePath } from "../lib/app-paths";
import { logger as log } from "../logger";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

const hasMigrationJournal = (folder: string): boolean => {
	return existsSync(join(folder, "meta", "_journal.json"));
};

function resolveMigrationsFolder(): string {
	const candidates = [
		is.dev && join(app.getAppPath(), "drizzle"),
		join(process.resourcesPath, "drizzle"),
		join(app.getAppPath(), "drizzle"),
	].filter(Boolean) as string[];

	log.info("drizzle paths", {
		isDev: is.dev,
		resourcesPath: process.resourcesPath,
		candidates,
	});

	const folder = candidates.find(hasMigrationJournal);
	if (!folder) {
		throw new Error(
			`Can't find drizzle migrations. Looked in: ${candidates.join(", ")}`,
		);
	}

	log.info("drizzle migrations folder", folder);
	return folder;
}

function applyPragmas(sqlite: InstanceType<typeof Database>): void {
	const journal = sqlite.pragma("journal_mode = WAL", { simple: true });
	const mode = String(journal ?? "");
	if (mode.toLowerCase() !== "wal") {
		throw new Error(`SQLite WAL mode failed (${mode || "unknown"})`);
	}
	sqlite.pragma("synchronous = NORMAL");
	sqlite.pragma("temp_store = MEMORY");
	sqlite.pragma("mmap_size = 268435456");
	sqlite.pragma("cache_size = -8000");
	sqlite.pragma("busy_timeout = 5000");
	sqlite.pragma("wal_autocheckpoint = 1000");
	sqlite.pragma("foreign_keys = ON");
}

export function createDatabase() {
	const dbPath = appDatabasePath();
	log.info("opening sqlite", dbPath);
	const sqlite = new Database(dbPath);
	try {
		applyPragmas(sqlite);
		const db = drizzle(sqlite, { schema });
		migrate(db, { migrationsFolder: resolveMigrationsFolder() });
		return db;
	} catch (err) {
		log.error("createDatabase failed", err);
		sqlite.close();
		throw err;
	}
}

export async function initDatabase() {
	try {
		const db = createDatabase();
		await seedIfEmpty(db);
		return db;
	} catch (err) {
		log.error("initDatabase failed", err);
		throw err;
	}
}

export type DatabaseClient = ReturnType<typeof createDatabase>;

export type {
  Anime,
  AnimeInsert,
  AppSetting,
  AppSettingInsert,
  EpisodeFile,
  EpisodeFileInsert,
  History,
  HistoryInsert,
  ListEntry,
  ListEntryInsert,
  MediaCache,
  MediaCacheInsert,
  RelationsCache,
  RelationsCacheInsert,
  SyncQueue,
  SyncQueueInsert,
  TorrentArchive,
  TorrentArchiveInsert
} from "./types";

