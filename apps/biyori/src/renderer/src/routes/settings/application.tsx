import { createFileRoute } from "@tanstack/react-router";
import { ApplicationPanel } from "@/mainview/components/settings/application-panel";

export const Route = createFileRoute("/settings/application")({
	component: ApplicationPanel,
});
