import { createFileRoute } from "@tanstack/react-router";
import { ServicesPanel } from "@/mainview/components/settings/services-panel";

export const Route = createFileRoute("/settings/services")({
	component: ServicesPanel,
});
