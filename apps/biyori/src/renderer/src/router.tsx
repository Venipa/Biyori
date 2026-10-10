import { useTranslation } from "@biyori/translations/react";
import { createHashHistory, createRouter } from "@tanstack/react-router";
import { RouterFallback } from "@/mainview/components/app/shared/router-fallback";
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
}
