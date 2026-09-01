import { logger as log } from "@biyori/logger";
import { subscribeSettings } from "../settings";
import { initLibrary, restartLibraryWatch, scanLibraryQuick } from "../track/library";
import { getDb } from "./database.service";
import { Service } from "./service";

export default class LibraryService extends Service {
	readonly name = "library";
	readonly order = 40;

	onInit(): void {
		initLibrary(getDb());
		subscribeSettings(() => {
			void restartLibraryWatch();
		});
	}

	afterInit(): void {
		const database = getDb();
		void restartLibraryWatch();
		setTimeout(() => {
			void scanLibraryQuick(database).catch((error) => {
				log.error("[afterInit] scan failed", error);
			});
		}, 3000);
	}
}
