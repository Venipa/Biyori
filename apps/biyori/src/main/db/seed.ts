import { count } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
	appSettingsDefaultValues,
	appSettingsSchema,
} from "../../lib/schemas/app-settings";
import type * as schema from "./schema";
import { anime, appSetting } from "./schema";

export async function seedIfEmpty(
	database: BetterSQLite3Database<typeof schema>,
): Promise<void> {
	const [{ value }] = await database.select({ value: count() }).from(anime);
	if (value > 0) {
		return;
	}

	const settings = await database
		.select({ key: appSetting.key })
		.from(appSetting)
		.limit(1);
	if (settings[0]) {
		return;
	}

	await database.insert(appSetting).values({
		key: "app",
		value: JSON.stringify(appSettingsSchema.parse(appSettingsDefaultValues)),
	});
}
