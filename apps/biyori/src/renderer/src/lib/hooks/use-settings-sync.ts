import { trpc } from "@/mainview/trpc";

/** One settings subscription per window; keeps `settings.get` live and refreshes data that depends on changed keys. */
export function useSettingsSync(): void {
	const utils = trpc.useUtils();
	trpc.settings.onChange.useSubscription(undefined, {
		onData: (settings) => {
			const prev = utils.settings.get.getData();
			utils.settings.get.setData(undefined, settings);
			if (!prev) {
				return;
			}
			if (JSON.stringify(prev.libraryFolders) !== JSON.stringify(settings.libraryFolders)) {
				void utils.library.summary.invalidate();
			}
			if (prev.titleLanguage !== settings.titleLanguage) {
				void Promise.all([utils.anime.list.invalidate(), utils.anime.listed.invalidate(), utils.anime.byId.invalidate(), utils.anilist.search.invalidate()]);
			}
		},
	});
}
