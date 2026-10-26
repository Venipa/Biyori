import { credentialsStore } from "../stores";
import { anilistProvider } from "./anilist";
import { myAnimeListProvider } from "./myanimelist";
import type { ListProvider } from "./types";

export type { EntryPatch, ListProvider } from "./types";

/** Provider for the active account; signed out browses AniList, matching the DB file choice. */
export function activeProvider(): ListProvider {
	return credentialsStore.get("activeAccount")?.service === "myanimelist" ? myAnimeListProvider : anilistProvider;
}
