import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

declare global {
	interface Window {
		__BIYORI_START__?: string;
	}
}

function seedHash(): void {
	const params = new URLSearchParams(window.location.search);
	const fromQuery = params.get("to");
	const fromWindow = window.__BIYORI_START__;
	const hash = window.location.hash.replace(/^#/, "");
	const raw = fromQuery || fromWindow || hash || "/app/anime-list";
	const path = raw.startsWith("/") ? raw : `/${raw}`;
	const next = `#${path}`;
	if (window.location.hash !== next) {
		window.location.hash = next;
	}
	if (fromQuery) {
		params.delete("to");
		const search = params.toString();
		window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
	}
}

seedHash();

const hashHistory = createHashHistory();

export const router = createRouter({
	routeTree,
	history: hashHistory,
	defaultPendingMs: 0,
	defaultPendingMinMs: 0,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
