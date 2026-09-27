import { createFileRoute } from "@tanstack/react-router";
import { SettingsForm } from "@/mainview/components/app/settings/form-shell";
import { PageLoad } from "@/mainview/components/app/shell/page-load";
import { trpc } from "@/mainview/trpc";

export const Route = createFileRoute("/settings")({
	component: SettingsLayout,
});

function SettingsLayout() {
	const settingsQuery = trpc.settings.get.useQuery();
	return <PageLoad loading={!settingsQuery.data}>{settingsQuery.data ? <SettingsForm defaultValues={settingsQuery.data} /> : null}</PageLoad>;
}
