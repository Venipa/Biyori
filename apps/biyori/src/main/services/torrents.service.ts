import { initTorrents } from "../torrents";
import { getDb } from "./database.service";
import { Service } from "./service";

export default class TorrentsService extends Service {
	readonly name = "torrents";
	readonly order = 60;

	afterInit(): void {
		initTorrents(getDb());
	}
}
