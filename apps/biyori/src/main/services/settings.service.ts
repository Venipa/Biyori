import { loadAppSettings } from "../settings";
import { Service } from "./service";

export default class SettingsService extends Service {
	readonly name = "settings";
	readonly order = 10;

	onInit(): void {
		loadAppSettings();
	}
}
