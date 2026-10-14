import { createFileRoute } from "@tanstack/react-router";
import { RecognitionGeneralPanel } from "@/mainview/components/app/settings/recognition-panel";
import { parseSettingsCardSearch } from "@/mainview/lib/settings-nav";

export const Route = createFileRoute("/settings/recognition/general")({
	validateSearch: parseSettingsCardSearch,
	component: RecognitionGeneralPanel,
});
