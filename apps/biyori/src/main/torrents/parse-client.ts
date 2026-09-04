import { Worker } from "node:worker_threads";
import { createWorker, type WorkerClient } from "@biyori/worker";
import * as Sentry from "@sentry/electron/main";
import type { TorrentParseWorker } from "./parse-worker";
import workerPath from "./parse-worker?modulePath";

let client: WorkerClient<TorrentParseWorker> | null = null;

export function getTorrentParseWorker(): WorkerClient<TorrentParseWorker> {
	if (!client) {
		const worker = new Worker(workerPath);
		worker.on("error", (error) => {
			Sentry.captureException(error);
		});
		client = createWorker<TorrentParseWorker>(worker);
	}
	return client;
}
