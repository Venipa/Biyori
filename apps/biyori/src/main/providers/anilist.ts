import { toAnilistStatus, toFuzzyDateInput, toListEntryRow } from "../anilist/map";
import { readAnilistAuth, writeAnilistAuth } from "../anilist/store";
import {
	ensureAnimeCached,
	fetchAniListSeasonItems,
	fetchViewer,
	saveMediaListEntry,
	searchAniListMedia,
	syncAniListList,
	syncAniListLive,
	upsertMediaList,
} from "../anilist/sync";
import { loadAppSettings } from "../settings";
import type { ListProvider } from "./types";

function liveAuth() {
	const auth = readAnilistAuth();
	return auth && auth.expiresAt > Date.now() ? auth : null;
}

function requireAuth() {
	const auth = liveAuth();
	if (!auth) {
		throw new Error("AniList is not connected");
	}
	return auth;
}

export const anilistProvider: ListProvider = {
	service: "anilist",
	relationsColumn: 2,
	isConnected: () => liveAuth() != null,
	async refreshProfile(signal) {
		const auth = requireAuth();
		const viewer = await fetchViewer(auth.accessToken, signal);
		writeAnilistAuth({ ...auth, username: viewer.name, avatarUrl: viewer.avatarUrl ?? undefined, scoreFormat: viewer.scoreFormat });
	},
	importList(db, options) {
		const auth = requireAuth();
		return syncAniListList(db, { token: auth.accessToken, userId: auth.userId, signal: options.signal, onProgress: options.onProgress });
	},
	async saveEntry(animeId, patch) {
		const saved = await saveMediaListEntry({
			token: requireAuth().accessToken,
			mediaId: animeId,
			status: toAnilistStatus(patch.status, patch.rewatching),
			progress: patch.progress,
			score: patch.score,
			repeat: patch.timesRewatched,
			notes: patch.notes,
			startedAt: toFuzzyDateInput(patch.dateStarted),
			completedAt: toFuzzyDateInput(patch.dateCompleted),
		});
		return toListEntryRow(animeId, saved);
	},
	async addEntry(db, animeId, status) {
		const saved = await saveMediaListEntry({ token: requireAuth().accessToken, mediaId: animeId, status: toAnilistStatus(status, false) });
		if (!(await upsertMediaList(db, saved, loadAppSettings().titleLanguage))) {
			throw new Error("Could not save the list entry locally");
		}
	},
	ensureAnime(db, id, signal) {
		return ensureAnimeCached({ db, id, token: liveAuth()?.accessToken, titleLanguage: loadAppSettings().titleLanguage, signal });
	},
	search(query, page) {
		return searchAniListMedia({ token: liveAuth()?.accessToken, query, page, titleLanguage: loadAppSettings().titleLanguage });
	},
	seasonItems(season, seasonYear, signal) {
		return fetchAniListSeasonItems({ token: liveAuth()?.accessToken, season, seasonYear, signal });
	},
	async refreshAiring(db, signal) {
		const auth = liveAuth();
		return auth ? syncAniListLive(db, { token: auth.accessToken, signal }) : 0;
	},
};
