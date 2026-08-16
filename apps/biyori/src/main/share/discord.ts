import type { AppSettings, DefaultService } from "../../lib/schemas/app-settings";
import DiscordClient from "../lib/discord-rpc";
import {
  type DiscordActivity,
  DiscordActivityStatusDisplayType,
  DiscordActivityType,
} from "../lib/discord-rpc/discord-rpc";
import type { NowPlayingSnapshot } from "../track/types";

const CONNECT_RETRY_MS = 5_000;
const MAX_CONNECTION_RETRIES = 30;
const COVER_PROXY_ORIGIN = "https://corx.venipa.workers.dev";
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
if (!DISCORD_CLIENT_ID) {
	throw new Error("VITE_DISCORD_CLIENT_ID is not set");
}

function proxiedCoverImage(coverUrl: string): string | undefined {
	if (!coverUrl) {
		return undefined;
	}
	return `${COVER_PROXY_ORIGIN}/?url=${encodeURIComponent(coverUrl)}`;
}

function providerSmallImage(provider: DefaultService): string {
	return `${provider}_logo`;
}

let client: DiscordClient | null = null;
let wantConnected = false;
let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let connectPromise: Promise<boolean> | null = null;
let lastClientId = "";

function clientIdFrom(settings: AppSettings): string {
	return (
		settings.discordApplicationId.trim() ||
		DISCORD_CLIENT_ID ||
		""
	);
}

function clearRetry(): void {
	if (retryTimer) {
		clearTimeout(retryTimer);
		retryTimer = null;
	}
}

function destroyClient(): void {
	if (client) {
		client.removeAllListeners();
		client.destroy();
		client = null;
	}
}

function scheduleReconnect(settings: AppSettings): void {
	if (!wantConnected || !settings.updateRichPresence) {
		return;
	}
	if (retryTimer || connectPromise) {
		return;
	}
	if (retries >= MAX_CONNECTION_RETRIES) {
		retries = 0;
		return;
	}
	retryTimer = setTimeout(() => {
		retryTimer = null;
		void ensureConnected(settings);
	}, CONNECT_RETRY_MS);
}

async function ensureConnected(settings: AppSettings): Promise<boolean> {
	const clientId = clientIdFrom(settings);
	if (!wantConnected || !settings.updateRichPresence || !clientId) {
		return false;
	}
	if (client?.isConnected && lastClientId === clientId) {
		return true;
	}
	if (connectPromise) {
		return connectPromise;
	}
	connectPromise = (async () => {
		retries += 1;
		destroyClient();
		const next = new DiscordClient(clientId);
		lastClientId = clientId;
		next.on("close", () => {
			scheduleReconnect(settings);
		});
		next.on("error", () => {
			scheduleReconnect(settings);
		});
		client = next;
		try {
			await next.connect();
			retries = 0;
			return true;
		} catch {
			scheduleReconnect(settings);
			return false;
		}
	})().finally(() => {
		connectPromise = null;
	});
	return connectPromise;
}

export function syncDiscordPresence(
	snapshot: NowPlayingSnapshot | null,
	settings: AppSettings,
): void {
	const clientId = clientIdFrom(settings);
	wantConnected = settings.updateRichPresence && Boolean(clientId);
	if (!wantConnected) {
		clearRetry();
		client?.clearActivity();
		destroyClient();
		return;
	}
	void ensureConnected(settings).then((ok) => {
		if (!ok || !client?.isConnected) {
			return;
		}
		if (!snapshot?.match || !snapshot.parsed) {
			client.clearActivity();
			return;
		}
		const largeImage = snapshot.match.coverUrl.startsWith("https://")
			? snapshot.match.coverUrl
			: proxiedCoverImage(snapshot.match.coverUrl);
		const smallImage = providerSmallImage(snapshot.user.provider);
		const assets: DiscordActivity["assets"] = {
			large_text: snapshot.match.title,
			small_image: smallImage,
		};
		if (snapshot.user.name) {
			assets.small_text = snapshot.user.name;
		}
		if (largeImage) {
			assets.large_image = largeImage;
		}
		client.setActivity({
			type: DiscordActivityType.Watching,
			status_display_type: DiscordActivityStatusDisplayType.Details,
			details: snapshot.match.title,
			state: snapshot.parsed.episode
				? `Episode ${snapshot.parsed.episode}`
				: "Watching",
			timestamps: settings.showElapsedTime && snapshot.startedAt
				? { start: snapshot.startedAt }
				: undefined,
			assets,
			instance: false,
			buttons: snapshot.match
				? [
						{
							label: "AniList",
							url: `https://anilist.co/anime/${snapshot.match.id}`,
						},
					]
				: undefined,
		});
	});
}
