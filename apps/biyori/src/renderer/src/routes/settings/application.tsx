import { createFileRoute } from "@tanstack/react-router";
import { ApplicationPanel } from "@/mainview/components/app/settings/application-panel";

export const Route = createFileRoute("/settings/application")({
	component: ApplicationPanel,
});
