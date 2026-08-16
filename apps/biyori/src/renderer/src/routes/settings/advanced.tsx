import { createFileRoute } from "@tanstack/react-router";
import { AdvancedPanel } from "@/mainview/components/settings/advanced-panel";

export const Route = createFileRoute("/settings/advanced")({
	component: AdvancedPanel,
});
