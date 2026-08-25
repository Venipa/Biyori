import {
	folderPathExists,
	normalizeFolderPath,
} from "@/lib/folder-path";
import { desktopRpc } from "@/desktop-rpc";
import { trpc } from "@/mainview/trpc";

export { folderPathExists, normalizeFolderPath };

export async function pickLibraryFolderPath(): Promise<string | null> {
	const { path } = await desktopRpc.request.pickFolder({});
	const normalized = normalizeFolderPath(path ?? "");
	return normalized.length > 0 ? normalized : null;
}

export async function pickFilePath(): Promise<string | null> {
	const { path } = await desktopRpc.request.pickFile({});
	const trimmed = path?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

export function useAddLibraryFolder() {
	const utils = trpc.useUtils();
	const add = trpc.settings.addLibraryFolder.useMutation({
		onSuccess: (settings) => {
			utils.settings.get.setData(undefined, settings);
		},
	});

	return {
		isPending: add.isPending,
		addFromPicker: async () => {
			const path = await pickLibraryFolderPath();
			if (!path) {
				return;
			}
			await add.mutateAsync({ path });
		},
	};
}
