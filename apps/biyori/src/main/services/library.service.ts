import { logger as log } from "../logger";
import {
  initLibrary,
  restartLibraryWatch,
  scanLibrary,
} from "../track/library";
import { getDb } from "./database.service";
import { Service } from "./service";

export default class LibraryService extends Service {
	readonly name = "library";
	readonly order = 40;

	onInit(): void {
		initLibrary(getDb());
	}

	afterInit(): void {
		const database = getDb();
		void restartLibraryWatch();
		setTimeout(() => {
			void scanLibrary(database).catch((error) => {
				log.error("[afterInit] scan failed", error);
			});
		}, 3000);
	}
}
