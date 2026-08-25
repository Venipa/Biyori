import { ipcLink } from "@biyori/electron-trpc/renderer";
import { createTRPCClient } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../shared/app-router";

const client = createTRPCClient<AppRouter>({
	links: [ipcLink({ transformer: superjson })],
});

export const desktopRpc = {
	request: {
		openSettings: (_input?: Record<string, never>) => client.desktop.openSettings.mutate(),
		closeSettings: (_input?: Record<string, never>) => client.desktop.closeSettings.mutate(),
		openUpdate: (_input?: Record<string, never>) => client.desktop.openUpdate.mutate(),
		closeUpdate: (_input?: Record<string, never>) => client.desktop.closeUpdate.mutate(),
		minimizeWindow: (_input?: Record<string, never>) => client.desktop.minimizeWindow.mutate(),
		toggleMaximizeWindow: (_input?: Record<string, never>) => client.desktop.toggleMaximizeWindow.mutate(),
		closeWindow: (_input?: Record<string, never>) => client.desktop.closeWindow.mutate(),
		windowState: (_input?: Record<string, never>) => client.desktop.windowState.query(),
		openPath: (input: { path: string }) => client.desktop.openPath.mutate(input),
		openExternal: (input: { url: string }) => client.desktop.openExternal.mutate(input),
		pickFolder: (_input?: Record<string, never>) => client.desktop.pickFolder.mutate(),
		pickFile: (_input?: Record<string, never>) => client.desktop.pickFile.mutate(),
		exportBiyori: (input: { defaultName: string; payload: Record<string, unknown> }) => client.desktop.exportBiyori.mutate(input),
		importBiyori: (_input?: Record<string, never>) => client.desktop.importBiyori.mutate(),
		showDefaultContextMenu: (_input?: Record<string, never>) => client.desktop.showDefaultContextMenu.mutate(),
	},
};
