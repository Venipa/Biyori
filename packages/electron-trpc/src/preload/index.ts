import { contextBridge, ipcRenderer } from "electron";
import { ELECTRON_TRPC_CHANNEL } from "../constants";
import type { RendererGlobalElectronTRPC } from "../types";

export { ELECTRON_TRPC_CHANNEL } from "../constants";

export function exposeElectronTRPC(): void {
	const electronTRPC: RendererGlobalElectronTRPC = {
		sendMessage: (operation) =>
			ipcRenderer.send(ELECTRON_TRPC_CHANNEL, operation),
		onMessage: (callback) => {
			ipcRenderer.on(ELECTRON_TRPC_CHANNEL, (_event, args) => {
				callback(args);
			});
		},
	};

	if (process.contextIsolated) {
		contextBridge.exposeInMainWorld("electronTRPC", electronTRPC);
		return;
	}

	(
		globalThis as typeof globalThis & {
			electronTRPC: RendererGlobalElectronTRPC;
		}
	).electronTRPC = electronTRPC;
}
