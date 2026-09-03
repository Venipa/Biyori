import { isProduction } from "@/utils";
import { log } from "@biyori/logger";
import { app } from "electron";
import path from "node:path";
import { handleBiyoriDeepLink } from "./anilist/connect";
import { setTrayState } from "./handlers/tray-state";

const PROTOCOL = "biyori";

let pending: string | null = null;
let live = false;

function redactDeepLink(raw: string): string {
	if (isProduction) return raw.replace(/(access_token|code)=[^&"'#]+/gi, "$1=<redacted>");
	return raw;
}

export function urlFromArgv(argv: string[]): string | null {
	for (const arg of argv) {
		const trimmed = arg.trim().replace(/^["']+|["']+$/g, "");
		if (trimmed.startsWith(`${PROTOCOL}://`)) {
			return trimmed;
		}
	}
	return null;
}

export function installBiyoriProtocol(): void {
	if (process.defaultApp && process.argv[1]) {
		app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
	} else {
		app.setAsDefaultProtocolClient(PROTOCOL);
	}
	app.on("open-url", (event, url) => {
		event.preventDefault();
		log.debug("protocol open-url", redactDeepLink(url));
		receiveDeepLink(url);
	});
	app.on("second-instance", (_event, argv) => {
		const url = urlFromArgv(argv);
		log.debug("protocol second-instance", {
			found: Boolean(url),
			argv: argv.map(redactDeepLink),
		});
		if (url) {
			receiveDeepLink(url);
		}
		setTrayState("visible");
	});
}

export function startProtocolHandling(): void {
	if (live) {
		return;
	}
	live = true;
	const fromArgv = urlFromArgv(process.argv);
	const url = pending ?? fromArgv;
	log.debug("protocol flush", {
		hadPending: Boolean(pending),
		fromArgv: fromArgv ? redactDeepLink(fromArgv) : null,
		argv: process.argv.map(redactDeepLink),
	});
	pending = null;
	if (url) {
		receiveDeepLink(url);
	}
}

function receiveDeepLink(raw: string): void {
	log.debug("protocol receive", { live, url: redactDeepLink(raw) });
	if (!live) {
		pending = raw;
		return;
	}
	void handleBiyoriDeepLink(raw);
	setTrayState("visible");
}
