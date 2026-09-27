import { createFileRoute } from "@tanstack/react-router";
import { SharingPanel } from "@/mainview/components/app/settings/sharing-panel";

export const Route = createFileRoute("/settings/sharing")({
	component: SharingPanel,
});
