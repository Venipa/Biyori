export function resolveRendererRoutePath(input: { hash: string; to: string | null; start?: string }): string {
	const hash = input.hash.replace(/^#/, "");
	if (hash) {
		return hash.startsWith("/") ? hash : `/${hash}`;
	}
	const raw = input.to || input.start || "/app/anime-list";
	return raw.startsWith("/") ? raw : `/${raw}`;
}

export function rendererRoutePath(): string {
	return resolveRendererRoutePath({
		hash: window.location.hash,
		to: new URLSearchParams(window.location.search).get("to"),
		start: window.__BIYORI_START__,
	});
}

export function seedRendererHash(): void {
	if (window.location.hash.replace(/^#/, "")) {
		return;
	}
	window.location.hash = resolveRendererRoutePath({
		hash: "",
		to: new URLSearchParams(window.location.search).get("to"),
		start: window.__BIYORI_START__,
	});
}
