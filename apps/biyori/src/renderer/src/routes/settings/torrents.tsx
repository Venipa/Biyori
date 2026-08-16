import { createFileRoute } from "@tanstack/react-router";
import { TorrentsPanel } from "@/mainview/components/settings/torrents-panel";

export const Route = createFileRoute("/settings/torrents")({
	component: TorrentsPanel,
});
