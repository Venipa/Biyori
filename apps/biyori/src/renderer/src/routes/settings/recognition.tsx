import { createFileRoute } from "@tanstack/react-router";
import { RecognitionPanel } from "@/mainview/components/settings/recognition-panel";

export const Route = createFileRoute("/settings/recognition")({
	component: RecognitionPanel,
});
