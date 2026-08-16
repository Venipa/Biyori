import type { AnyRouter, inferRouterContext } from "@trpc/server";
import { ipcMain } from "electron";
import type { BrowserWindow, IpcMainEvent } from "electron";
import { ELECTRON_TRPC_CHANNEL } from "../constants";
import type { ETRPCRequest } from "../types";
import {
	handleIPCMessage,
	type SubscriptionHandle,
} from "./handle-ipc-message";
import type { CreateContextOptions } from "./types";

type Awaitable<T> = T | Promise<T>;

function getInternalId(event: IpcMainEvent, request: ETRPCRequest): string {
	const messageId =
		request.method === "request" ? request.operation.id : request.id;
	const frameId = event.senderFrame?.routingId ?? 0;
	return `${event.sender.id}-${frameId}:${messageId}`;
}

class IPCHandler<TRouter extends AnyRouter> {
	#windows: BrowserWindow[] = [];
	#subscriptions = new Map<string, SubscriptionHandle>();
	#listening = false;

	constructor({
		createContext,
		router,
		windows = [],
	}: {
		createContext?: (
			opts: CreateContextOptions,
		) => Awaitable<inferRouterContext<TRouter>>;
		router: TRouter;
		windows?: BrowserWindow[];
	}) {
		if (!this.#listening) {
			this.#listening = true;
			ipcMain.on(
				ELECTRON_TRPC_CHANNEL,
				(event: IpcMainEvent, request: ETRPCRequest) => {
					void handleIPCMessage({
						router,
						createContext,
						internalId: getInternalId(event, request),
						event,
						message: request,
						subscriptions: this.#subscriptions,
					});
				},
			);
		}

		for (const win of windows) {
			this.attachWindow(win);
		}
	}

	attachWindow(win: BrowserWindow): void {
		if (this.#windows.includes(win)) {
			return;
		}
		this.#windows.push(win);
		this.#attachSubscriptionCleanupHandlers(win);
	}

	detachWindow(win: BrowserWindow, webContentsId?: number): void {
		if (win.isDestroyed() && webContentsId === undefined) {
			throw new Error(
				"webContentsId is required when calling detachWindow on a destroyed window",
			);
		}
		this.#windows = this.#windows.filter((item) => item !== win);
		this.#cleanUpSubscriptions({
			webContentsId: webContentsId ?? win.webContents.id,
		});
	}

	#cleanUpSubscriptions({
		webContentsId,
		frameRoutingId,
	}: {
		webContentsId: number;
		frameRoutingId?: number;
	}): void {
		const prefix = `${webContentsId}-${frameRoutingId ?? ""}`;
		for (const [key, sub] of this.#subscriptions.entries()) {
			if (key.startsWith(prefix)) {
				sub.unsubscribe();
				this.#subscriptions.delete(key);
			}
		}
	}

	#attachSubscriptionCleanupHandlers(win: BrowserWindow): void {
		const webContentsId = win.webContents.id;
		win.webContents.on("did-start-navigation", ({ isSameDocument, frame }) => {
			if (!isSameDocument && frame) {
				this.#cleanUpSubscriptions({
					webContentsId,
					frameRoutingId: frame.routingId,
				});
			}
		});
		win.webContents.on("destroyed", () => {
			this.detachWindow(win, webContentsId);
		});
	}
}

export function createIPCHandler<TRouter extends AnyRouter>({
	createContext,
	router,
	windows = [],
}: {
	createContext?: (
		opts: CreateContextOptions,
	) => Awaitable<inferRouterContext<TRouter>>;
	router: TRouter;
	windows?: BrowserWindow[];
}): IPCHandler<TRouter> {
	return new IPCHandler({ createContext, router, windows });
}
