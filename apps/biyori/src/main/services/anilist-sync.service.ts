import { initAniListSync } from "../sync";
import { getDb } from "./database.service";
import { Service } from "./service";

export default class AniListSyncService extends Service {
	readonly name = "anilist-sync";
	readonly order = 30;

	onInit(): void {
		initAniListSync(getDb());
	}
}
