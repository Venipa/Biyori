import { createWorkerServe, defineProcedure } from "@biyori/worker";
import { findEpisodeInFolder, scanLibraryRoots, type FindEpisodeInput, type ScanInput } from "./scan-core";

const server = createWorkerServe({
	procedures: {
		scan: defineProcedure((input: ScanInput, ctx) => {
			return scanLibraryRoots({ ...input, signal: ctx.signal });
		}),
		findEpisode: defineProcedure((input: FindEpisodeInput, ctx) => {
			return findEpisodeInFolder({ ...input, signal: ctx.signal });
		}),
	},
});

export type LibraryScanWorker = typeof server;
