import { createFileRoute } from "@tanstack/react-router";
import { StatisticsView } from "@/mainview/components/statistics-view";

export const Route = createFileRoute("/app/statistics")({
	component: StatisticsView,
});
