import AniListSyncService from "./anilist-sync.service";
import DatabaseService from "./database.service";
import HttpService from "./http.service";
import LibraryService from "./library.service";
import { type LifecyclePhase, lifecycle } from "./lifecycle";
import {
	isService,
	isServiceClass,
	type Service,
	serviceHook,
} from "./service";
import SettingsService from "./settings.service";
import TorrentsService from "./torrents.service";
import TrackerService from "./tracker.service";
import UpdaterService from "./updater.service";

export { getDb } from "./database.service";
export {
	AppLifecycle,
	afterInit,
	beforeLoad,
	type LifecycleFn,
	type LifecyclePhase,
	lifecycle,
	onInit,
} from "./lifecycle";
export { isService, kService, Service } from "./service";

const SERVICE_EXPORTS: unknown[] = [
	DatabaseService,
	SettingsService,
	HttpService,
	AniListSyncService,
	LibraryService,
	TrackerService,
	TorrentsService,
	UpdaterService,
];

const PHASES: LifecyclePhase[] = ["beforeLoad", "onInit", "afterInit"];

function instantiate(value: unknown): Service | null {
	if (isService(value)) {
		return value;
	}
	if (isServiceClass(value)) {
		return new value();
	}
	return null;
}

let registered = false;

function registerAppServices(): void {
	if (registered) {
		return;
	}
	registered = true;

	const services = SERVICE_EXPORTS.map(instantiate)
		.filter((service): service is Service => service !== null)
		.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

	if (services.length === 0) {
		throw new Error("No services loaded");
	}

	for (const service of services) {
		for (const phase of PHASES) {
			const hook = serviceHook(service, phase);
			if (hook) {
				lifecycle[phase](hook);
			}
		}
	}
}

export async function boot(): Promise<void> {
	registerAppServices();
	await lifecycle.run("beforeLoad");
	await lifecycle.run("onInit");
}

export function scheduleAfterInit(): void {
	setTimeout(() => {
		void lifecycle.run("afterInit");
	}, 0);
}
