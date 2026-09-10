import { createEncryptedStore } from "../../lib/store/createYmlStore";
import { credentialsStoreMigrations } from "./migrations";

export type AccountToken = {
	accessToken: string;
	expiresAt: number;
};

export type CredentialsFile = {
	activeAccountId?: number | null;
	tokens?: Record<string, AccountToken>;
};

export const credentialsStore = createEncryptedStore<CredentialsFile>("credentials", {
	defaults: {},
	migrations: credentialsStoreMigrations,
});
