import { subscribeSettings } from "../settings";
import { initLibrary, restartLibraryWatch } from "../track/library";
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
		void restartLibraryWatch();
	}
}
