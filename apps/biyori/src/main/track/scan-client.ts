import { createWorker, type WorkerClient } from "@biyori/worker";
import type { LibraryScanWorker } from "./scan-worker";
import workerPath from "./scan-worker?modulePath";

let client: WorkerClient<LibraryScanWorker> | null = null;

export function getLibraryScanWorker(): WorkerClient<LibraryScanWorker> {
	if (!client) {
		client = createWorker<LibraryScanWorker>(workerPath);
	}
	return client;
}
