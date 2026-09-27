import { createFileRoute } from "@tanstack/react-router";
import { SettingsCachePanel } from "@/mainview/components/app/settings/settings-cache-panel";

export const Route = createFileRoute("/settings/advanced/cache")({
	component: SettingsCachePanel,
});
