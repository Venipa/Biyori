import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/mainview/components/app/about/page";

export const Route = createFileRoute("/app/about")({
	component: AboutPage,
});
