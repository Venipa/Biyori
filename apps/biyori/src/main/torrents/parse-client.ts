import { createWorker, type WorkerClient } from "@biyori/worker";
import type { TorrentParseWorker } from "./parse-worker";
import workerPath from "./parse-worker?modulePath";

let client: WorkerClient<TorrentParseWorker> | null = null;

export function getTorrentParseWorker(): WorkerClient<TorrentParseWorker> {
	if (!client) {
		client = createWorker<TorrentParseWorker>(workerPath);
	}
	return client;
}
