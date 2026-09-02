import { Outlet, redirect } from "@tanstack/react-router";
import { settingsFirstChildHref, settingsSectionHref } from "@/mainview/lib/settings-nav";

export function settingsGroupBeforeLoad(sectionId: string) {
	return ({ location }: { location: { pathname: string } }) => {
		const base = settingsSectionHref(sectionId);
		if (location.pathname === base || location.pathname === `${base}/`) {
			throw redirect({ to: settingsFirstChildHref(sectionId) });
		}
	};
}

export function SettingsGroupOutlet() {
	return <Outlet />;
}
