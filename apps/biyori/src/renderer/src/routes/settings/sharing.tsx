import { createFileRoute } from "@tanstack/react-router";
import { SharingPanel } from "@/mainview/components/settings/sharing-panel";

export const Route = createFileRoute("/settings/sharing")({
	component: SharingPanel,
});
