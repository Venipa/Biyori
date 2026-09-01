import { createHashHistory, createRouter } from "@tanstack/react-router";
import { RouterFallback } from "@/mainview/components/router-fallback";
import { seedRendererHash } from "./lib/start-path";
import { routeTree } from "./routeTree.gen";

declare global {
	interface Window {
		__BIYORI_START__?: string;
	}
}

seedRendererHash();

const hashHistory = createHashHistory();

export const router = createRouter({
	routeTree,
	history: hashHistory,
	defaultPendingMs: 0,
	defaultPendingMinMs: 0,
	defaultErrorComponent: () => <RouterFallback title='Could not load' description='This view failed to open.' />,
	defaultNotFoundComponent: () => <RouterFallback title='Not found' description='This view does not exist.' />,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
