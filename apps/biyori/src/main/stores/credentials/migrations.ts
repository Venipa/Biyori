import type { Migration } from "electron-conf/main";
import type { CredentialsFile } from "./store";

export const credentialsStoreMigrations: Migration<CredentialsFile>[] = [
	{
		version: 1,
		hook: (conf) => {
			// AniList-only era: numeric activeAccountId, tokens keyed by bare user id
			const legacyId = conf.get("activeAccountId");
			if (typeof legacyId === "number" && Number.isFinite(legacyId)) {
				conf.set("activeAccount", { service: "anilist", id: legacyId });
			}
			conf.delete("activeAccountId");
			const tokens = conf.get("tokens") ?? {};
			const next: NonNullable<CredentialsFile["tokens"]> = {};
			for (const [key, token] of Object.entries(tokens)) {
				next[key.includes(":") ? key : `anilist:${key}`] = token;
			}
			conf.set("tokens", next);
		},
	},
];
