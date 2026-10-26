import { type MediaImageKind, mediaImageKindSchema } from "./schemas/media-image";

export const MEDIA_SCHEME = "biyori-media";

/** `src` is only the download fallback for titles not in the local list; keep it stable per title so the browser cache key is too. */
export function mediaImageUrl(kind: MediaImageKind, animeId: number, src?: string): string {
	const query = src ? `?src=${encodeURIComponent(src)}` : "";
	return `${MEDIA_SCHEME}://${kind}/${animeId}${query}`;
}

export function parseMediaImageUrl(raw: string): { kind: MediaImageKind; animeId: number; src?: string } | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== `${MEDIA_SCHEME}:`) {
		return null;
	}
	const kind = mediaImageKindSchema.safeParse(url.hostname);
	const id = url.pathname.replace(/^\//, "");
	if (!kind.success || !/^\d{1,10}$/.test(id)) {
		return null;
	}
	return { kind: kind.data, animeId: Number(id), src: url.searchParams.get("src") || undefined };
}
