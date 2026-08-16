import { loadAppSettings, subscribeSettings } from "../settings";
import { restartHttpServer } from "../share/http";
import { restartLibraryWatch } from "../track/library";
import { getDb } from "./database.service";
import { Service } from "./service";

export default class HttpService extends Service {
	readonly name = "http";
	readonly order = 20;

	async onInit(): Promise<void> {
		const settings = await loadAppSettings(getDb());
		restartHttpServer(settings);
		subscribeSettings((next) => {
			restartHttpServer(next);
			void restartLibraryWatch();
		});
	}
}
