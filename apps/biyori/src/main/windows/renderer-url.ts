export function isAllowedRendererUrl(url: string, rendererUrl = process.env.ELECTRON_RENDERER_URL): boolean {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	if (rendererUrl) {
		try {
			return parsed.origin === new URL(rendererUrl).origin;
		} catch {
			return false;
		}
	}
	if (parsed.protocol !== "file:") {
		return false;
	}
	const pathname = decodeURIComponent(parsed.pathname).replaceAll("\\", "/").toLowerCase();
	return pathname.endsWith("/index.html") || pathname.endsWith("index.html");
}

export function isHttpUrl(url: string): boolean {
	try {
		const protocol = new URL(url).protocol;
		return protocol === "http:" || protocol === "https:";
	} catch {
		return false;
	}
}
