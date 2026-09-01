import { log } from "@biyori/logger";
import { checkForAppUpdate } from "../updater";
import { Service } from "./service";

export default class UpdaterService extends Service {
	readonly name = "updater";
	readonly order = 70;

	afterInit(): void {
		setTimeout(() => {
			void checkForAppUpdate().catch((error) => {
				log.error("[afterInit] Launch update check failed", error);
			});
		}, 1500);
	}
}
