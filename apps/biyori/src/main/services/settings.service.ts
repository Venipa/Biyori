import { initSettings } from "../settings";
import { getDb } from "./database.service";
import { Service } from "./service";

export default class SettingsService extends Service {
	readonly name = "settings";
	readonly order = 10;

	onInit(): void {
		initSettings(getDb());
	}
}
