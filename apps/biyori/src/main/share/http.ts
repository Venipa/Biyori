import type { NowPlayingSnapshot } from "../track/types";
import type { AppSettings } from "../../lib/schemas/app-settings";
import { createServer, type Server } from "node:http";

let server: Server | null = null;
let snapshot: NowPlayingSnapshot | null = null;
let boundPort = 0;

export function setNowPlayingForHttp(next: NowPlayingSnapshot): void {
	snapshot = next;
}

export function restartHttpServer(settings: AppSettings): void {
	if (server && settings.enableHttp && boundPort === settings.httpPort) {
		return;
	}
	if (server) {
		server.close();
		server = null;
		boundPort = 0;
	}
	if (!settings.enableHttp) {
		return;
	}
	server = createServer((_req, res) => {
		res.setHeader("content-type", "application/json");
		res.end(
			JSON.stringify({
				playing: Boolean(snapshot?.match),
				title: snapshot?.match?.title ?? null,
				episode: snapshot?.parsed?.episode ?? null,
				player: snapshot?.media?.player ?? null,
				id: snapshot?.match?.id ?? null,
			}),
		);
	});
	server.listen(settings.httpPort, "127.0.0.1");
	boundPort = settings.httpPort;
}
