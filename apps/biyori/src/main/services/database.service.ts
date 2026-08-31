import { initActivityCenter } from "../activity";
import type { DatabaseClient } from "../db";
import { initDatabase } from "../db";
import { Service } from "./service";

let db: DatabaseClient | undefined;

export function getDb(): DatabaseClient {
	if (!db) {
		throw new Error("Database not initialized. Call boot() first.");
	}
	return db;
}

export default class DatabaseService extends Service {
	readonly name = "database";
	readonly order = 0;

	async beforeLoad(): Promise<void> {
		db = await initDatabase();
		await initActivityCenter(db);
	}
}
