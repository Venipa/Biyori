import { z } from "zod";
import { listStatusSchema } from "../../shared/list";
import { parseUpdateChannel } from "../../shared/updater";
import { normalizeFolderPath } from "../folder-path";
import { defaultMediaPlayerIds, defaultStreamingProviderIds } from "../recognition-catalog";
import { isTorrentFeedUrl } from "../torrent-feeds";
import { anilistSeasonNameSchema, seasonGroupBySchema, seasonSortBySchema, seasonViewAsSchema } from "./seasons";
import { torrentFiltersFileDefaultValues, torrentFilterSchema } from "./torrent-filter";

export const titleLanguageSchema = z.enum(["Romaji", "English", "Native"]);
export const torrentActionSchema = z.enum(["notify", "download"]);
export const torrentAppModeSchema = z.enum(["default", "custom"]);
export const torrentSortBySchema = z.enum(["episode_number", "release_date"]);
export const torrentSortOrderSchema = z.enum(["ascending", "descending"]);
export const defaultServiceSchema = z.enum(["anilist", "myanimelist", "kitsu"]);
export type DefaultService = z.infer<typeof defaultServiceSchema>;
export {
	anilistSeasonNameSchema,
	seasonGroupBySchema,
	seasonSortBySchema,
	seasonViewAsSchema,
} from "./seasons";

export const appSettingsSchema = z.object({
	defaultService: defaultServiceSchema,
	titleLanguage: titleLanguageSchema,
	defaultAddToListStatus: listStatusSchema.default("Plan to watch"),
	autostart: z.boolean().default(false),
	autostartTray: z.boolean().default(false),
	closeToTray: z.boolean().default(true),
	externalLinks: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string()),
	libraryFolders: z.array(
		z.object({
			path: z.preprocess((value) => (typeof value === "string" ? normalizeFolderPath(value) : value), z.string().min(1, "Required")),
		}),
	),
	realtimeMonitor: z.boolean(),
	ignoreOutsideLibrary: z.boolean(),
	ignoreOutOfRangeEpisode: z.boolean().default(false),
	recognitionDelaySeconds: z.coerce.number().int().min(0, "Required"),
	askToConfirmUpdate: z.boolean(),
	enableRecognition: z.boolean(),
	enableMediaPlayerDetection: z.boolean().default(true),
	enableStreamingDetection: z.boolean().default(false),
	enabledMediaPlayers: z.array(z.string()).default(defaultMediaPlayerIds()),
	enabledStreamingProviders: z.array(z.string()).default(defaultStreamingProviderIds()),
	notifyOnRecognized: z.boolean().default(true),
	notifyOnUnrecognized: z.boolean().default(true),
	goToNowPlayingOnRecognized: z.boolean().default(true),
	goToNowPlayingOnUnrecognized: z.boolean().default(false),
	playerMustBeInFocus: z.boolean().default(false),
	rssFeedUrl: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string().refine(isTorrentFeedUrl, "Enter a valid URL")),
	rssSearchUrl: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string().refine(isTorrentFeedUrl, "Enter a valid URL")),
	checkTorrentsAutomatically: z.boolean(),
	torrentCheckIntervalMinutes: z.coerce.number().int().min(10).max(3600),
	newTorrentAction: torrentActionSchema,
	torrentAppMode: torrentAppModeSchema.default("default"),
	torrentAppOpen: z.boolean().default(true),
	torrentAppPath: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string()),
	torrentUseAnimeFolder: z.boolean().default(true),
	torrentFallbackOnFolder: z.boolean().default(false),
	torrentCreateSubfolder: z.boolean().default(false),
	torrentDownloadDir: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string()),
	torrentFileDownloadPath: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string()),
	torrentUseMagnet: z.boolean().default(false),
	torrentDownloadSortBy: torrentSortBySchema.default("episode_number"),
	torrentDownloadSortOrder: torrentSortOrderSchema.default("ascending"),
	torrentArchiveMaxCount: z.coerce.number().int().min(0).default(1000),
	ignoredStrings: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string()),
	waitUntilPlayerExits: z.boolean().default(false),
	updateRichPresence: z.boolean(),
	showElapsedTime: z.boolean(),
	enableHttp: z.boolean(),
	httpPort: z.coerce.number().int().min(1).max(65535),
	discordApplicationId: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string()),
	uiTheme: z.preprocess((value) => (typeof value === "string" && value.length > 0 ? value : "Default"), z.string().min(1, "Required")),
	updateChannel: z.preprocess((value) => parseUpdateChannel(value), z.enum(["stable", "beta", "alpha"])),
	fileSizeThreshold: z.coerce.number().int().min(0, "Required"),
	mediaDetectionInterval: z.coerce.number().int().min(0, "Required"),
	seasonsGroupBy: seasonGroupBySchema.default("airing"),
	seasonsSortBy: seasonSortBySchema.default("date"),
	seasonsViewAs: seasonViewAsSchema.default("tiles"),
	seasonsLastSeason: anilistSeasonNameSchema.nullish(),
	seasonsLastYear: z.number().int().nullish(),
});

export const settingsFormSchema = appSettingsSchema.extend({
	torrentFilterEnabled: z.boolean().default(true),
	torrentFilters: z.array(torrentFilterSchema),
});
export type AppSettingsInput = z.input<typeof appSettingsSchema>;
export type AppSettings = z.output<typeof appSettingsSchema>;
export type SettingsFormInput = z.input<typeof settingsFormSchema>;
export type SettingsFormValues = z.output<typeof settingsFormSchema>;

function optionalPatchField(schema: z.ZodType): z.ZodType {
	if (schema.def.type === "default" && "removeDefault" in schema && typeof schema.removeDefault === "function") {
		return optionalPatchField(schema.removeDefault());
	}
	return schema.optional();
}

export const appSettingsPatchSchema = z.object(Object.fromEntries(Object.entries(appSettingsSchema.shape).map(([key, field]) => [key, optionalPatchField(field)])));
export type AppSettingsPatch = z.input<typeof appSettingsPatchSchema>;
export const settingsFormPatchSchema = z.object(Object.fromEntries(Object.entries(settingsFormSchema.shape).map(([key, field]) => [key, optionalPatchField(field)])));
export type SettingsFormPatch = z.input<typeof settingsFormPatchSchema>;

export const appSettingsDefaultValues: AppSettingsInput = {
	defaultService: "anilist",
	titleLanguage: "Romaji",
	defaultAddToListStatus: "Plan to watch",
	autostart: false,
	autostartTray: false,
	closeToTray: true,
	externalLinks: "Hibari|https://hb.wopian.me\nAniChart|http://anichart.net/airing",
	libraryFolders: [],
	realtimeMonitor: true,
	ignoreOutsideLibrary: true,
	ignoreOutOfRangeEpisode: false,
	recognitionDelaySeconds: 120,
	askToConfirmUpdate: true,
	enableRecognition: true,
	enableMediaPlayerDetection: true,
	enableStreamingDetection: false,
	enabledMediaPlayers: defaultMediaPlayerIds(),
	enabledStreamingProviders: defaultStreamingProviderIds(),
	notifyOnRecognized: true,
	notifyOnUnrecognized: true,
	goToNowPlayingOnRecognized: true,
	goToNowPlayingOnUnrecognized: false,
	playerMustBeInFocus: false,
	rssFeedUrl: "https://nyaa.si/?page=rss&c=1_2&f=0",
	rssSearchUrl: "https://nyaa.si/?page=rss&c=1_2&f=0&q=%title%",
	checkTorrentsAutomatically: true,
	torrentCheckIntervalMinutes: 60,
	newTorrentAction: "notify",
	torrentAppMode: "default",
	torrentAppOpen: true,
	torrentAppPath: "",
	torrentUseAnimeFolder: true,
	torrentFallbackOnFolder: false,
	torrentCreateSubfolder: false,
	torrentDownloadDir: "",
	torrentFileDownloadPath: "",
	torrentUseMagnet: false,
	torrentDownloadSortBy: "episode_number",
	torrentDownloadSortOrder: "ascending",
	torrentArchiveMaxCount: 1000,
	ignoredStrings: "",
	waitUntilPlayerExits: false,
	updateRichPresence: true,
	showElapsedTime: true,
	enableHttp: false,
	httpPort: 17464,
	discordApplicationId: "",
	uiTheme: "Default",
	updateChannel: "stable",
	fileSizeThreshold: 10485760,
	mediaDetectionInterval: 5,
	seasonsGroupBy: "airing",
	seasonsSortBy: "date",
	seasonsViewAs: "tiles",
	seasonsLastSeason: null,
	seasonsLastYear: null,
};

export const settingsFormDefaultValues: SettingsFormInput = {
	...appSettingsDefaultValues,
	torrentFilterEnabled: torrentFiltersFileDefaultValues.enabled,
	torrentFilters: torrentFiltersFileDefaultValues.filters,
};

const LEGACY_TORRENT_KEYS = ["torrentWatchingOnly", "torrentDiscardNotInList", "torrentDiscardAnimeIds"] as const;

function omitLegacyTorrentKeys(record: Record<string, unknown>): Record<string, unknown> {
	const next = { ...record };
	for (const key of LEGACY_TORRENT_KEYS) {
		delete next[key];
	}
	return next;
}

export function parseAppSettings(value: unknown): AppSettings {
	const direct = appSettingsSchema.safeParse(value);
	if (direct.success) {
		return direct.data;
	}
	const record = omitLegacyTorrentKeys(value && typeof value === "object" ? (value as Record<string, unknown>) : {});
	const merged = {
		...appSettingsDefaultValues,
		...record,
		libraryFolders: Array.isArray(record.libraryFolders) ? record.libraryFolders : appSettingsDefaultValues.libraryFolders,
		enabledMediaPlayers: Array.isArray(record.enabledMediaPlayers) ? record.enabledMediaPlayers : appSettingsDefaultValues.enabledMediaPlayers,
		enabledStreamingProviders: Array.isArray(record.enabledStreamingProviders) ? record.enabledStreamingProviders : appSettingsDefaultValues.enabledStreamingProviders,
	};
	const parsed = appSettingsSchema.safeParse(merged);
	if (parsed.success) {
		return parsed.data;
	}
	return appSettingsSchema.parse(appSettingsDefaultValues);
}
