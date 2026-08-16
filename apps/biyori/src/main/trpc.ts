import { initTRPC } from "@trpc/server";
import type { BrowserWindow } from "electron";
import superjson from "superjson";
import type { DatabaseClient } from "./db";

export type TrpcContext = {
	db: DatabaseClient;
	getBrowserWindow: () => BrowserWindow | null;
};

export const t = initTRPC.context<TrpcContext>().create({
	transformer: superjson,
});
