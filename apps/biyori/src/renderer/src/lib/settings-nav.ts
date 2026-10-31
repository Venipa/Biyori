import type { LucideIcon } from "lucide-react";
import { AppWindowIcon, DownloadIcon, FolderIcon, GlobeIcon, ScanEyeIcon, Share2Icon, SlidersHorizontalIcon } from "lucide-react";

export type SettingsNavChild = {
	id: string;
};

export type SettingsNavSection = {
	id: string;
	icon: LucideIcon;
	children?: readonly SettingsNavChild[];
};

export const settingsSections = [
	{ id: "services", icon: GlobeIcon },
	{ id: "library", icon: FolderIcon },
	{ id: "application", icon: AppWindowIcon },
	{
		id: "recognition",
		icon: ScanEyeIcon,
		children: [{ id: "general" }, { id: "sources" }],
	},
	{ id: "sharing", icon: Share2Icon },
	{
		id: "torrents",
		icon: DownloadIcon,
		children: [{ id: "general" }, { id: "filters" }],
	},
	{
		id: "advanced",
		icon: SlidersHorizontalIcon,
		children: [{ id: "general" }, { id: "cache" }],
	},
] as const satisfies readonly SettingsNavSection[];

export type SettingsSectionId = (typeof settingsSections)[number]["id"];

export function settingsCardElementId(cardId: string): string {
	return `settings-card-${cardId}`;
}

export function settingsCardFromViewport(cardIds: readonly string[], root: HTMLElement): string {
	if (cardIds.length === 0) {
		return "";
	}
	if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) {
		return cardIds[cardIds.length - 1] ?? "";
	}
	const top = root.getBoundingClientRect().top;
	let current = cardIds[0] ?? "";
	for (const id of cardIds) {
		const el = document.getElementById(settingsCardElementId(id));
		// Same line scrollIntoView lands the card on (its scroll-margin-top), so a clicked card is active.
		if (el && el.getBoundingClientRect().top <= top + (Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0) + 1) {
			current = id;
		}
	}
	return current;
}

export function parseSettingsCardSearch(search: Record<string, unknown>): { card?: string } {
	const card = search.card;
	if (typeof card === "string" && card.length > 0) {
		return { card };
	}
	return {};
}

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
	uiLocale: { section: "application" },
	defaultAddToListStatus: { section: "application" },
	autostart: { section: "application" },
	autostartTray: { section: "application" },
	updateChannel: { section: "application" },
	closeToTray: { section: "application" },
	sendCrashReports: { section: "application" },
	externalLinks: { section: "application" },
	libraryFolders: { section: "library" },
	realtimeMonitor: { section: "library" },
	episodeScanEnabled: { section: "library" },
	episodeScanIntervalMinutes: { section: "library" },
	continueWatchingStaleDays: { section: "library" },
	continueWatchingPlanned: { section: "library" },
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
	onboardingComplete: { section: "application" },
	fileSizeThreshold: { section: "advanced", child: "general" },
	mediaDetectionInterval: { section: "advanced", child: "general" },
};

export function settingsFieldHref(field: string): string {
	const nav = settingsFieldNav[field] ?? { section: "application" };
	return settingsSectionHref(nav.section, nav.child);
}
