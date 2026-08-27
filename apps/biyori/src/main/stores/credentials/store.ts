import { createEncryptedStore } from "../../lib/store/createYmlStore";
import { credentialsStoreMigrations } from "./migrations";

export type CredentialsFile = {
	anilist?: {
		accessToken: string;
		expiresAt: number;
		userId: number;
		username: string;
	} | null;
};

export const credentialsStore = createEncryptedStore<CredentialsFile>("credentials", {
	defaults: {},
	migrations: credentialsStoreMigrations,
});
