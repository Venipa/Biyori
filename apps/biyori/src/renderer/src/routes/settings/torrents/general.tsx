import { createFileRoute } from "@tanstack/react-router";
import { TorrentsGeneralPanel } from "@/mainview/components/app/settings/torrents-panel";

export const Route = createFileRoute("/settings/torrents/general")({
	component: TorrentsGeneralPanel,
});
