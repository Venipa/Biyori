import { initTracker } from "../track/tracker";
import { getDb } from "./database.service";
import { Service } from "./service";

export default class TrackerService extends Service {
	readonly name = "tracker";
	readonly order = 50;

	afterInit(): void {
		initTracker(getDb());
	}
}
