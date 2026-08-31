export type MediaPlayerOption = {
	id: string;
	label: string;
	processes: readonly string[];
};

export type StreamingProviderOption = {
	id: string;
	label: string;
	processes?: readonly string[];
	titlePattern: string;
};

export const MEDIA_PLAYERS: readonly MediaPlayerOption[] = [
	{ id: "gom", label: "GOM Player", processes: ["gom", "gomplayer"] },
	{ id: "kmplayer", label: "KMPlayer", processes: ["kmplayer"] },
	{ id: "mpc-be", label: "MPC-BE", processes: ["mpc-be", "mpc-be64", "mpcbe"] },
	{ id: "mpc-hc", label: "MPC-HC", processes: ["mpc-hc", "mpc-hc64", "mpchc"] },
	{ id: "mpc-qt", label: "MPC-QT", processes: ["mpc-qt"] },
	{ id: "mpcstar", label: "MPCSTAR", processes: ["mpcstar"] },
	{ id: "mpdn", label: "MPDN", processes: ["mpdn"] },
	{ id: "mpv", label: "mpv", processes: ["mpv"] },
	{ id: "mpvnet", label: "mpv.net", processes: ["mpvnet"] },
	{ id: "mv2player", label: "MV2Player", processes: ["mv2player"] },
	{ id: "potplayer", label: "PotPlayer", processes: ["potplayer", "potplayermini", "potplayermini64"] },
	{ id: "smplayer", label: "SMPlayer", processes: ["smplayer"] },
	{ id: "splash", label: "Splash", processes: ["splash"] },
	{ id: "splayer", label: "SPlayer", processes: ["splayer"] },
	{ id: "umplayer", label: "UMPlayer", processes: ["umplayer"] },
	{ id: "vlc", label: "VLC media player", processes: ["vlc"] },
	{ id: "webtorrent", label: "WebTorrent Desktop", processes: ["webtorrent", "webtorrent-desktop"] },
	{ id: "winamp", label: "Winamp", processes: ["winamp"] },
	{ id: "wmplayer", label: "Windows Media Player", processes: ["wmplayer"] },
	{ id: "zoomplayer", label: "Zoom Player", processes: ["zplayer", "zoomplayer"] },
];

export const STREAMING_PROVIDERS: readonly StreamingProviderOption[] = [
	{ id: "animelab", label: "AnimeLab", titlePattern: "AnimeLab" },
	{ id: "adn", label: "Anime Digital Network", titlePattern: "ADN" },
	{ id: "ann", label: "Anime News Network", titlePattern: "Anime News Network" },
	{ id: "bilibili", label: "Bilibili", titlePattern: "Bilibili" },
	{
		id: "jellyfin",
		label: "Jellyfin Web App",
		processes: ["jellyfin", "jellyfinmediaplayer", "jellyfintray"],
		titlePattern: "Jellyfin",
	},
	{
		id: "plex",
		label: "Plex Web App",
		processes: ["plex", "plexamp"],
		titlePattern: "Plex",
	},
	{ id: "roku", label: "Roku Channel", titlePattern: "Roku" },
	{ id: "tubi", label: "Tubi", titlePattern: "Tubi" },
	{ id: "veoh", label: "Veoh", titlePattern: "Veoh" },
	{ id: "viz", label: "VIZ", titlePattern: "VIZ" },
	{ id: "vrv", label: "VRV", titlePattern: "VRV" },
	{ id: "wakanim", label: "Wakanim", titlePattern: "Wakanim" },
	{ id: "yahoo", label: "Yahoo View", titlePattern: "Yahoo View" },
	{ id: "youtube", label: "YouTube", titlePattern: "YouTube" },
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
