import { createFileRoute } from "@tanstack/react-router";
import { RecognitionSourcesPanel } from "@/mainview/components/app/settings/recognition-panel";
import { parseSettingsCardSearch } from "@/mainview/lib/settings-nav";

export const Route = createFileRoute("/settings/recognition/sources")({
	validateSearch: parseSettingsCardSearch,
	component: RecognitionSourcesPanel,
});
