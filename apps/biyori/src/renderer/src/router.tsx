import { useTranslation } from "@biyori/translations/react";
import { createHashHistory, createRouter } from "@tanstack/react-router";
import { RouterFallback } from "@/mainview/components/app/shared/router-fallback";
import { seedRendererHash } from "./lib/start-path";
import { routeTree } from "./routeTree.gen";
import { trpcUtils } from "./trpc";

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
	context: { utils: trpcUtils },
	// loaders only prefetch, so hovering a link warms its data without blocking navigation
	defaultPreload: "intent",
	defaultErrorComponent: RouterError,
	defaultNotFoundComponent: RouterNotFound,
});

function RouterError() {
	const { t } = useTranslation();
	return <RouterFallback title={t("common.couldNotLoad")} description={t("common.viewFailed")} />;
}

function RouterNotFound() {
	const { t } = useTranslation();
	return <RouterFallback title={t("common.notFound")} description={t("common.viewMissing")} />;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
	interface StaticDataRouteOption {
		/** "none": no title bar or scrim (splash); "child": title bar, no parent scrim (settings, update). Inherited by child routes. */
		chrome?: "none" | "child";
	}
}
