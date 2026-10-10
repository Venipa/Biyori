import { useTranslation } from "@biyori/translations/react";
import { useId } from "react";
import { useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { SettingsFieldError } from "@/mainview/components/app/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { FormCheckbox } from "@/mainview/components/app/shared/form-checkbox";
import { Field, FieldDescription, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";

export function SharingPanel() {
	const { t } = useTranslation();
	const presenceId = useId();
	const elapsedId = useId();
	const httpId = useId();
	const portId = useId();
	const clientId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<SettingsSectionCard title={t("settings.sharing.discordTitle")} description={t("settings.sharing.discordDescription")}>
				<FormCheckbox control={form.control} name='updateRichPresence' id={presenceId} label={t("settings.sharing.updatePresence")} />
				<Field>
					<FieldLabel htmlFor={clientId}>{t("settings.sharing.applicationId")}</FieldLabel>
					<Input id={clientId} placeholder={t("settings.sharing.applicationIdPlaceholder")} {...form.register("discordApplicationId")} />
					<SettingsFieldError<AppSettingsInput> name='discordApplicationId' />
				</Field>
				<FormCheckbox control={form.control} name='showElapsedTime' id={elapsedId} label={t("settings.sharing.elapsed")} />
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.sharing.httpTitle")} description={t("settings.sharing.httpDescription")}>
				<FormCheckbox control={form.control} name='enableHttp' id={httpId} label={t("settings.sharing.enableHttp")} />
				<Field>
					<FieldLabel htmlFor={portId}>{t("settings.sharing.port")}</FieldLabel>
					<Input id={portId} type='number' className='w-28' {...form.register("httpPort", { valueAsNumber: true })} />
					<SettingsFieldError<AppSettingsInput> name='httpPort' />
				</Field>
				<FieldDescription>{t("settings.sharing.httpHint")}</FieldDescription>
			</SettingsSectionCard>
		</>
	);
}
