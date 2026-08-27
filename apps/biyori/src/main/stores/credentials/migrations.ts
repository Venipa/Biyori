import type { Migration } from "electron-conf/main";
import type { CredentialsFile } from "./store";

export const credentialsStoreMigrations: Migration<CredentialsFile>[] = [];
