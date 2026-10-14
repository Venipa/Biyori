import { createFileRoute } from "@tanstack/react-router";
import { ApplicationPanel } from "@/mainview/components/app/settings/application-panel";
import { parseSettingsCardSearch } from "@/mainview/lib/settings-nav";

export const Route = createFileRoute("/settings/application")({
	validateSearch: parseSettingsCardSearch,
	component: ApplicationPanel,
});
