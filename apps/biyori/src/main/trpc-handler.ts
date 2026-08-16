import { createIPCHandler } from "@biyori/electron-trpc/main";
import { BrowserWindow } from "electron";
import { appRouter } from "./router/app";
import { getDb } from "./services";

type TrpcHandler = ReturnType<typeof createIPCHandler>;

let handler: TrpcHandler | null = null;

export function initElectronTrpc(): void {
	handler = createIPCHandler({
		router: appRouter,
		createContext: ({ event }) => ({
			db: getDb(),
			getBrowserWindow: () => BrowserWindow.fromWebContents(event.sender),
		}),
	});
}

export function attachTrpcWindow(win: BrowserWindow): void {
	handler?.attachWindow(win);
}
