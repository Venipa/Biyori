import { createFileRoute } from "@tanstack/react-router";
import { LibraryPanel } from "@/mainview/components/settings/library-panel";

export const Route = createFileRoute("/settings/library")({
	component: LibraryPanel,
});
