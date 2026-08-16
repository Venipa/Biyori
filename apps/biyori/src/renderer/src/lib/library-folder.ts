import { desktopRpc } from "@/desktop-rpc";
import { trpc } from "@/mainview/trpc";

export async function pickLibraryFolderPath(): Promise<string | null> {
	const { path } = await desktopRpc.request.pickFolder({});
	const trimmed = path?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
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
