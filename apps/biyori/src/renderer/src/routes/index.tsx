import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	pendingComponent: () => null,
	beforeLoad: () => {
		throw redirect({ to: "/app/anime-list" });
	},
});
