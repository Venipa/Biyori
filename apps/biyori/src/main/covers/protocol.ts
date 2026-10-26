import { logger as log } from "@biyori/logger";
import { protocol } from "electron";
import { MEDIA_SCHEME, parseMediaImageUrl } from "../../lib/media-url";
import { getDb } from "../services";
import { MediaCacheError, resolveMediaImage } from "./cache";

/** Must run before `app.whenReady()`. `standard` + `secure` let Chromium cache and treat it like https. */
export function registerMediaScheme(): void {
	protocol.registerSchemesAsPrivileged([{ scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
}

/** Serves cached covers/banners to `<img>`; downloads into the disk cache on a miss. Needs the db, so call after boot. */
export function handleMediaProtocol(): void {
	protocol.handle(MEDIA_SCHEME, async (request) => {
		const parsed = parseMediaImageUrl(request.url);
		if (!parsed) {
			return new Response(null, { status: 400 });
		}
		try {
			const image = await resolveMediaImage(getDb(), { animeId: parsed.animeId, kind: parsed.kind, fallbackUrl: parsed.src });
			return new Response(new Uint8Array(image.bytes), {
				headers: { "Content-Type": image.mime, "Cache-Control": "max-age=31536000, immutable" },
			});
		} catch (error) {
			if (!(error instanceof MediaCacheError)) {
				log.error("media protocol failed", error);
			}
			return new Response(null, { status: 404 });
		}
	});
}
