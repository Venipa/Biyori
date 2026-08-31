import { BROWSER_PROCESSES, MEDIA_PLAYERS, STREAMING_PROVIDERS } from "../../lib/recognition-catalog";
import type { AppSettings } from "../../lib/schemas/app-settings";
import { hana } from "./hana-client";
import type { NowPlayingMedia } from "./types";

function processNames(settings: AppSettings): string[] {
	const names: string[] = [];
	if (settings.enableMediaPlayerDetection) {
		for (const player of MEDIA_PLAYERS) {
			if (settings.enabledMediaPlayers.includes(player.id)) {
				names.push(...player.processes);
			}
		}
	}
	if (settings.enableStreamingDetection) {
		names.push(...BROWSER_PROCESSES);
		for (const provider of STREAMING_PROVIDERS) {
			if (!settings.enabledStreamingProviders.includes(provider.id)) {
				continue;
			}
			if (provider.processes) {
				names.push(...provider.processes);
			}
		}
	}
	return names;
}

function titleNeedles(settings: AppSettings): string[] {
	if (!settings.enableStreamingDetection) {
		return [];
	}
	return STREAMING_PROVIDERS.filter((provider) => settings.enabledStreamingProviders.includes(provider.id)).map((provider) => provider.titlePattern);
}

export async function getNowPlayingMedia(settings: AppSettings, preferredWindowId?: string): Promise<NowPlayingMedia | null> {
	if (!settings.enableMediaPlayerDetection && !settings.enableStreamingDetection) {
		return null;
	}
	const names = processNames(settings);
	if (names.length === 0) {
		return null;
	}
	try {
		const hit = await hana.nowPlaying({
			processNames: names,
			browserNames: settings.enableStreamingDetection ? [...BROWSER_PROCESSES] : [],
			titleNeedles: titleNeedles(settings),
			preferredWindowId,
		});
		if (!hit) {
			return null;
		}
		return {
			player: hit.player,
			windowId: hit.windowId,
			title: hit.title,
			filePath: hit.filePath,
			url: hit.url,
			foreground: hit.foreground,
		};
	} catch {
		return null;
	}
}
