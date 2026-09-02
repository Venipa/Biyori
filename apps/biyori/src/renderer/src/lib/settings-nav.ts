import { AppWindowIcon, DownloadIcon, FolderIcon, GlobeIcon, ScanEyeIcon, Share2Icon, SlidersHorizontalIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SettingsNavChild = {
	id: string;
	label: string;
	description: string;
};

export type SettingsNavSection = {
	id: string;
	label: string;
	description: string;
	icon: LucideIcon;
	children?: readonly SettingsNavChild[];
};

export const settingsSections = [
	{ id: "services", label: "Services", description: "List providers and account login.", icon: GlobeIcon },
	{ id: "library", label: "Library", description: "Folders Biyori scans for episodes.", icon: FolderIcon },
	{ id: "application", label: "Application", description: "Titles, startup, updates, and tray.", icon: AppWindowIcon },
	{
		id: "recognition",
		label: "Recognition",
		description: "Match playing media to your list.",
		icon: ScanEyeIcon,
		children: [
			{ id: "general", label: "General", description: "Matching, validation, and notifications." },
			{ id: "sources", label: "Sources", description: "Media players and streaming sites." },
		],
	},
	{ id: "sharing", label: "Sharing", description: "Discord presence and local HTTP.", icon: Share2Icon },
	{
		id: "torrents",
		label: "Torrents",
		description: "Feeds, downloads, and filters.",
		icon: DownloadIcon,
		children: [
			{ id: "general", label: "General", description: "Feeds, downloads, and client." },
			{ id: "filters", label: "Filters", description: "Download the files you want and ignore the others." },
		],
	},
	{
		id: "advanced",
		label: "Advanced",
		description: "Low-level options. Change with care.",
		icon: SlidersHorizontalIcon,
		children: [
			{ id: "general", label: "General", description: "Low-level options. Change with care." },
			{ id: "cache", label: "Cache", description: "Clear stored files and history." },
		],
	},
] as const satisfies readonly SettingsNavSection[];

export type SettingsSectionId = (typeof settingsSections)[number]["id"];

export function settingsSectionHref(sectionId: string, childId?: string): string {
	return childId ? `/settings/${sectionId}/${childId}` : `/settings/${sectionId}`;
}

export function settingsFirstChildHref(sectionId: string): string {
	const section = settingsSections.find((item) => item.id === sectionId);
	if (!section) {
		return settingsSectionHref(sectionId);
	}
	const child = "children" in section ? section.children[0] : undefined;
	return child ? settingsSectionHref(section.id, child.id) : settingsSectionHref(section.id);
}

export function matchSettingsNav(pathname: string): {
	section: (typeof settingsSections)[number] | undefined;
	child: SettingsNavChild | undefined;
} {
	const section = settingsSections.find((item) => pathname === settingsSectionHref(item.id) || pathname.startsWith(`${settingsSectionHref(item.id)}/`));
	const child = section && "children" in section ? section.children.find((item) => pathname === settingsSectionHref(section.id, item.id)) : undefined;
	return { section, child };
}

export const settingsFieldNav: Record<string, { section: SettingsSectionId; child?: string }> = {
	defaultService: { section: "services" },
	titleLanguage: { section: "application" },
	uiZoom: { section: "application" },
	defaultAddToListStatus: { section: "application" },
	autostart: { section: "application" },
	autostartTray: { section: "application" },
	updateChannel: { section: "application" },
	closeToTray: { section: "application" },
	externalLinks: { section: "application" },
	libraryFolders: { section: "library" },
	realtimeMonitor: { section: "library" },
	ignoreOutsideLibrary: { section: "recognition", child: "general" },
	ignoreOutOfRangeEpisode: { section: "recognition", child: "general" },
	recognitionDelaySeconds: { section: "recognition", child: "general" },
	askToConfirmUpdate: { section: "recognition", child: "general" },
	enableRecognition: { section: "recognition", child: "general" },
	enableMediaPlayerDetection: { section: "recognition", child: "sources" },
	enableStreamingDetection: { section: "recognition", child: "sources" },
	enabledMediaPlayers: { section: "recognition", child: "sources" },
	enabledStreamingProviders: { section: "recognition", child: "sources" },
	notifyOnRecognized: { section: "recognition", child: "general" },
	notifyOnUnrecognized: { section: "recognition", child: "general" },
	goToNowPlayingOnRecognized: { section: "recognition", child: "general" },
	goToNowPlayingOnUnrecognized: { section: "recognition", child: "general" },
	playerMustBeInFocus: { section: "recognition", child: "general" },
	rssFeedUrl: { section: "torrents", child: "general" },
	rssSearchUrl: { section: "torrents", child: "general" },
	checkTorrentsAutomatically: { section: "torrents", child: "general" },
	torrentCheckIntervalMinutes: { section: "torrents", child: "general" },
	newTorrentAction: { section: "torrents", child: "general" },
	torrentFilterEnabled: { section: "torrents", child: "filters" },
	torrentFilters: { section: "torrents", child: "filters" },
	torrentAppMode: { section: "torrents", child: "general" },
	torrentAppOpen: { section: "torrents", child: "general" },
	torrentAppPath: { section: "torrents", child: "general" },
	torrentUseAnimeFolder: { section: "torrents", child: "general" },
	torrentFallbackOnFolder: { section: "torrents", child: "general" },
	torrentCreateSubfolder: { section: "torrents", child: "general" },
	torrentDownloadDir: { section: "torrents", child: "general" },
	torrentFileDownloadPath: { section: "advanced", child: "general" },
	torrentUseMagnet: { section: "advanced", child: "general" },
	torrentDownloadSortBy: { section: "torrents", child: "general" },
	torrentDownloadSortOrder: { section: "torrents", child: "general" },
	torrentArchiveMaxCount: { section: "advanced", child: "general" },
	ignoredStrings: { section: "recognition", child: "general" },
	waitUntilPlayerExits: { section: "recognition", child: "general" },
	updateRichPresence: { section: "sharing" },
	showElapsedTime: { section: "sharing" },
	enableHttp: { section: "sharing" },
	httpPort: { section: "sharing" },
	discordApplicationId: { section: "sharing" },
	uiTheme: { section: "advanced", child: "general" },
	fileSizeThreshold: { section: "advanced", child: "general" },
	mediaDetectionInterval: { section: "advanced", child: "general" },
};

export function settingsFieldHref(field: string): string {
	const nav = settingsFieldNav[field] ?? { section: "application" };
	return settingsSectionHref(nav.section, nav.child);
}
