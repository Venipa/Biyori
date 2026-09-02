import { createFileRoute } from "@tanstack/react-router";
import { SettingsGroupOutlet, settingsGroupBeforeLoad } from "@/mainview/lib/settings-group-route";

export const Route = createFileRoute("/settings/recognition")({
	beforeLoad: settingsGroupBeforeLoad("recognition"),
	component: SettingsGroupOutlet,
});
