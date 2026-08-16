import { createFileRoute } from "@tanstack/react-router";
import { HistoryView } from "@/mainview/components/history-view";

export const Route = createFileRoute("/app/history")({
	component: HistoryView,
});
