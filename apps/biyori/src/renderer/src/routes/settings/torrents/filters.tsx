import { createFileRoute } from "@tanstack/react-router";
import { TorrentsFiltersPanel } from "@/mainview/components/app/settings/torrents-panel";

export const Route = createFileRoute("/settings/torrents/filters")({
	component: TorrentsFiltersPanel,
});
