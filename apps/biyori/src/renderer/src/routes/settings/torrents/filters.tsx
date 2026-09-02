import { createFileRoute } from "@tanstack/react-router";
import { TorrentsFiltersPanel } from "@/mainview/components/settings/torrents-panel";

export const Route = createFileRoute("/settings/torrents/filters")({
	component: TorrentsFiltersPanel,
});
