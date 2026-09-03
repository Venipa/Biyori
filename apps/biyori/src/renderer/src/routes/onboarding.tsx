import { createFileRoute, Navigate } from "@tanstack/react-router";
import { OnboardingWizard } from "@/mainview/components/onboarding-wizard";
import { PageLoad } from "@/mainview/components/page-load";
import { trpc } from "@/mainview/trpc";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingPage,
});

function OnboardingPage() {
	const settingsQuery = trpc.settings.get.useQuery();
	if (settingsQuery.data?.onboardingComplete) {
		return <Navigate to='/app/anime-list' />;
	}
	return (
		<PageLoad loading={!settingsQuery.data}>
			<OnboardingWizard />
		</PageLoad>
	);
}
