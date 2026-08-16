import { createWorker, type WorkerClient } from "@biyori/worker";
import workerPath from "./parse-worker?modulePath";
import type { TorrentParseWorker } from "./parse-worker";

let client: WorkerClient<TorrentParseWorker> | null = null;

export function getTorrentParseWorker(): WorkerClient<TorrentParseWorker> {
	if (!client) {
		client = createWorker<TorrentParseWorker>(workerPath);
	}
	return client;
}
