import { exposeElectronTRPC } from "@biyori/electron-trpc/preload";
import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge } from "electron";

exposeElectronTRPC();

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("electron", electronAPI);
	} catch (error) {
		console.error(error);
	}
} else {
	(
		globalThis as typeof globalThis & {
			electron: typeof electronAPI;
		}
	).electron = electronAPI;
}
