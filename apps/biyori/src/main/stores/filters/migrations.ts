import type { Migration } from "electron-conf/main";
import type { TorrentFiltersFile } from "../../../lib/schemas/torrent-filter";

export const filtersStoreMigrations: Migration<TorrentFiltersFile>[] = [];
