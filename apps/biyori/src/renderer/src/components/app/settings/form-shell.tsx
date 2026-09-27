import { zodResolver } from "@hookform/resolvers/zod";
import { Outlet } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";
import { type SettingsFormInput, type SettingsFormValues, settingsFormSchema } from "@/lib/schemas/app-settings";
import { SettingsChrome } from "@/mainview/components/app/settings/chrome";
import { SettingsCloseGuard } from "@/mainview/components/app/settings/settings-close-guard";
import { SettingsSaveBar } from "@/mainview/components/app/settings/settings-save-bar";

export function SettingsForm({ defaultValues }: { defaultValues: SettingsFormInput | SettingsFormValues }) {
	const form = useForm<SettingsFormInput, unknown, SettingsFormValues>({
		resolver: zodResolver(settingsFormSchema),
		defaultValues,
		shouldUnregister: false,
	});

	return (
		<FormProvider {...form}>
			<SettingsChrome
				overlay={
					<>
						<SettingsSaveBar />
						<SettingsCloseGuard />
					</>
				}>
				<Outlet />
			</SettingsChrome>
		</FormProvider>
	);
}
