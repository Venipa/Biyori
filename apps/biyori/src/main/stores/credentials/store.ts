import type { DefaultService } from "../../../lib/schemas/app-settings";
import { createEncryptedStore } from "../../lib/store/createYmlStore";
import { credentialsStoreMigrations } from "./migrations";

/** Token plus the profile shown in the UI; lives here (not in a service DB) so a login can be stored before switching DBs. */
export type AccountToken = {
	accessToken: string;
	expiresAt: number;
	refreshToken?: string;
	username?: string;
	avatarUrl?: string;
	scoreFormat?: string;
};

export type AccountService = Exclude<DefaultService, "kitsu">;

export type AccountRef = {
	service: AccountService;
	id: number;
};

export type CredentialsFile = {
	activeAccount?: AccountRef | null;
	/** set before a switch relaunch; applied on next startup */
	pendingAccount?: AccountRef | null;
	/** keyed by accountKey() */
	tokens?: Record<string, AccountToken>;
	/** legacy, migrated to activeAccount */
	activeAccountId?: number | null;
};

export function accountKey(ref: AccountRef): string {
	return `${ref.service}:${ref.id}`;
}

export const credentialsStore = createEncryptedStore<CredentialsFile>("credentials", {
	defaults: {},
	migrations: credentialsStoreMigrations,
});
