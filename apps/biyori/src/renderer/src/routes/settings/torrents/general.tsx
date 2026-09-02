import { createFileRoute } from "@tanstack/react-router";
import { TorrentsGeneralPanel } from "@/mainview/components/settings/torrents-panel";

export const Route = createFileRoute("/settings/torrents/general")({
	component: TorrentsGeneralPanel,
});
