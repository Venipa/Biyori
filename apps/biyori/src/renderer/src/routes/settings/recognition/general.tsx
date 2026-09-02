import { createFileRoute } from "@tanstack/react-router";
import { RecognitionGeneralPanel } from "@/mainview/components/settings/recognition-panel";

export const Route = createFileRoute("/settings/recognition/general")({
	component: RecognitionGeneralPanel,
});
