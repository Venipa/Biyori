import { createFileRoute } from "@tanstack/react-router";
import { RecognitionGeneralPanel } from "@/mainview/components/app/settings/recognition-panel";

export const Route = createFileRoute("/settings/recognition/general")({
	component: RecognitionGeneralPanel,
});
