import type { MediaImageKind } from "../../lib/schemas/media-image";

const HOST_PATH = {
	cover: /^s\d\.anilist\.co\/file\/anilistcdn\/media\/(anime|manga)\/(cover|poster)/,
	banner: /^s\d\.anilist\.co\/file\/anilistcdn\/media\/anime\/banner/,
} as const;

export function isAllowedMediaUrl(kind: MediaImageKind, rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		if (url.protocol !== "https:") {
			return false;
		}
		return HOST_PATH[kind].test(url.hostname + url.pathname);
	} catch {
		return false;
	}
}

export function isAllowedCoverUrl(rawUrl: string): boolean {
	return isAllowedMediaUrl("cover", rawUrl);
}
