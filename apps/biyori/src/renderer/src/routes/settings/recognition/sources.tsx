import { createFileRoute } from "@tanstack/react-router";
import { RecognitionSourcesPanel } from "@/mainview/components/settings/recognition-panel";

export const Route = createFileRoute("/settings/recognition/sources")({
	component: RecognitionSourcesPanel,
});
