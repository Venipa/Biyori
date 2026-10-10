export type MediaPlayerOption = {
	id: string;
	processes: readonly string[];
};

export type StreamingProviderOption = {
	id: string;
	processes?: readonly string[];
	titlePattern: string;
	urlPattern?: string;
};

export const MEDIA_PLAYERS: readonly MediaPlayerOption[] = [
	{ id: "gom", processes: ["gom", "gomplayer"] },
	{ id: "kmplayer", processes: ["kmplayer"] },
	{ id: "mpc-be", processes: ["mpc-be", "mpc-be64", "mpcbe"] },
	{ id: "mpc-hc", processes: ["mpc-hc", "mpc-hc64", "mpchc"] },
	{ id: "mpc-qt", processes: ["mpc-qt"] },
	{ id: "mpcstar", processes: ["mpcstar"] },
	{ id: "mpdn", processes: ["mpdn"] },
	{ id: "mpv", processes: ["mpv"] },
	{ id: "mpvnet", processes: ["mpvnet"] },
	{ id: "mv2player", processes: ["mv2player"] },
	{ id: "potplayer", processes: ["potplayer", "potplayermini", "potplayermini64"] },
	{ id: "smplayer", processes: ["smplayer"] },
	{ id: "splash", processes: ["splash"] },
	{ id: "splayer", processes: ["splayer"] },
	{ id: "umplayer", processes: ["umplayer"] },
	{ id: "vlc", processes: ["vlc"] },
	{ id: "webtorrent", processes: ["webtorrent", "webtorrent-desktop"] },
	{ id: "winamp", processes: ["winamp"] },
	{ id: "wmplayer", processes: ["wmplayer"] },
	{ id: "zoomplayer", processes: ["zplayer", "zoomplayer"] },
];

export const STREAMING_PROVIDERS: readonly StreamingProviderOption[] = [
	{ id: "animelab", titlePattern: "AnimeLab", urlPattern: "animelab\\.com/player/" },
	{ id: "adn", titlePattern: "ADN", urlPattern: "animedigitalnetwork\\.fr/video/" },
	{ id: "ann", titlePattern: "Anime News Network", urlPattern: "animenewsnetwork\\.(?:com|cc)/video/" },
	{ id: "bilibili", titlePattern: "Bilibili", urlPattern: "bilibili\\.tv/.+/play/" },
	{ id: "crunchyroll", titlePattern: "Crunchyroll", urlPattern: "crunchyroll\\.com/" },
	{ id: "funimation", titlePattern: "Funimation", urlPattern: "funimation\\.com/" },
	{ id: "hidive", titlePattern: "HIDIVE", urlPattern: "hidive\\.com/" },
	{
		id: "jellyfin",
		processes: ["jellyfin", "jellyfinmediaplayer", "jellyfintray"],
		titlePattern: "Jellyfin",
		urlPattern: "jellyfin|:8096|/web/(?:index\\.html)?(?:#!?)?/(?:video|playback|details)|/web/#/",
	},
	{
		id: "plex",
		processes: ["plex", "plexamp"],
		titlePattern: "Plex",
		urlPattern: "plex\\.tv|/web/|localhost:32400|:32400/web",
	},
	{ id: "roku", titlePattern: "Roku", urlPattern: "therokuchannel\\.roku\\.com/watch/" },
	{ id: "tubi", titlePattern: "Tubi", urlPattern: "tubitv\\.com/tv-shows/" },
	{ id: "veoh", titlePattern: "Veoh", urlPattern: "veoh\\.com/watch/" },
	{ id: "viz", titlePattern: "VIZ", urlPattern: "viz\\.com/watch/" },
	{ id: "vrv", titlePattern: "VRV", urlPattern: "vrv\\.co/watch/" },
	{ id: "wakanim", titlePattern: "Wakanim", urlPattern: "wakanim\\.tv/.+/catalogue/episode/" },
	{ id: "yahoo", titlePattern: "Yahoo View", urlPattern: "view\\.yahoo\\.com/show/" },
	{ id: "youtube", titlePattern: "YouTube", urlPattern: "youtube\\.com/watch" },
	{ id: "netflix", titlePattern: "Netflix", urlPattern: "netflix\\.com/(?:watch|title)/" },
];

export const BROWSER_PROCESSES = new Set(["chrome", "msedge", "firefox", "brave", "opera", "chromium"]);

export function defaultMediaPlayerIds(): string[] {
	return MEDIA_PLAYERS.map((player) => player.id);
}

export function defaultStreamingProviderIds(): string[] {
	return STREAMING_PROVIDERS.map((provider) => provider.id);
}

export function processKey(name: string): string {
	return name.toLowerCase().replace(/\.exe$/i, "");
}

export function isBrowserProcess(name: string): boolean {
	return BROWSER_PROCESSES.has(processKey(name));
}

export function matchMediaPlayerId(processName: string, enabledIds: readonly string[]): string | null {
	const key = processKey(processName);
	for (const player of MEDIA_PLAYERS) {
		if (!enabledIds.includes(player.id)) {
			continue;
		}
		if (player.processes.some((process) => key === process || key.includes(process))) {
			return player.id;
		}
	}
	return null;
}

export function matchStreamingProviderId(processName: string, windowTitle: string, enabledIds: readonly string[]): string | null {
	const key = processKey(processName);
	const browser = isBrowserProcess(processName);
	for (const provider of STREAMING_PROVIDERS) {
		if (!enabledIds.includes(provider.id)) {
			continue;
		}
		if (provider.processes?.some((process) => key === process || key.includes(process))) {
			return provider.id;
		}
		if (browser && windowTitle.toLowerCase().includes(provider.titlePattern.toLowerCase())) {
			return provider.id;
		}
	}
	return null;
}
