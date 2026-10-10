import { useTranslation } from "@biyori/translations/react";
import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { SettingsFieldError } from "@/mainview/components/app/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { SettingsSelect } from "@/mainview/components/app/settings/settings-select";
import { SettingsToggleGroup } from "@/mainview/components/app/settings/settings-toggle-group";
import { FormCheckbox } from "@/mainview/components/app/shared/form-checkbox";
import { UpdateChannelToggle } from "@/mainview/components/app/update/channel-toggle";
import { Field, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { Textarea } from "@/mainview/components/ui/textarea";
import { listStatusSchema } from "@/shared/list";
import { parseUpdateChannel } from "@/shared/updater";

const UI_ZOOM_OPTIONS = [
	{ value: "75", label: "75%" },
	{ value: "90", label: "90%" },
	{ value: "100", label: "100%" },
	{ value: "110", label: "110%" },
	{ value: "125", label: "125%" },
	{ value: "150", label: "150%" },
] as const;

function listStatusLabel(t: ReturnType<typeof useTranslation>["t"], status: string): string {
	switch (status) {
		case "Currently watching":
			return t("settings.listStatus.currentlyWatching");
		case "Completed":
			return t("settings.listStatus.completed");
		case "On hold":
			return t("settings.listStatus.onHold");
		case "Dropped":
			return t("settings.listStatus.dropped");
		case "Plan to watch":
			return t("settings.listStatus.planToWatch");
		default:
			return status;
	}
}

export function ApplicationPanel() {
	const { t } = useTranslation();
	const titleLanguageOptions = [
		{ value: "Romaji", label: t("settings.application.romaji") },
		{ value: "English", label: t("settings.application.english") },
		{ value: "Native", label: t("settings.application.native") },
	];
	const listStatusOptions = listStatusSchema.options.map((status) => ({
		value: status,
		label: listStatusLabel(t, status),
	}));
	const titleLanguageId = useId();
	const uiZoomId = useId();
	const defaultAddToListStatusId = useId();
	const autostartId = useId();
	const closeToTrayId = useId();
	const sendCrashReportsId = useId();
	const updateChannelId = useId();
	const externalLinksId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<SettingsSectionCard title={t("settings.application.titlesTitle")} description={t("settings.application.titlesDescription")}>
				<Controller
					control={form.control}
					name='titleLanguage'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={titleLanguageId}>{t("settings.application.titleLanguage")}</FieldLabel>
							<SettingsToggleGroup
								id={titleLanguageId}
								value={typeof field.value === "string" ? field.value : "Romaji"}
								onValueChange={field.onChange}
								options={titleLanguageOptions}
								aria-invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.application.displayTitle")} description={t("settings.application.displayDescription")}>
				<Controller
					control={form.control}
					name='uiZoom'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={uiZoomId}>{t("settings.application.zoom")}</FieldLabel>
							<SettingsSelect
								id={uiZoomId}
								value={String(typeof field.value === "number" ? field.value : 100)}
								onValueChange={(value) => field.onChange(Number(value))}
								options={UI_ZOOM_OPTIONS}
								aria-invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.application.addToListTitle")} description={t("settings.application.addToListDescription")}>
				<Controller
					control={form.control}
					name='defaultAddToListStatus'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={defaultAddToListStatusId}>{t("settings.application.defaultStatus")}</FieldLabel>
							<SettingsSelect
								id={defaultAddToListStatusId}
								value={typeof field.value === "string" ? field.value : "Plan to watch"}
								onValueChange={field.onChange}
								options={listStatusOptions}
								aria-invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.application.startupTitle")}>
				<FormCheckbox control={form.control} name='autostart' id={autostartId} label={t("settings.application.autostart")} />
				<AutostartTrayField />
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.application.updatesTitle")} description={t("settings.application.updatesDescription")}>
				<Controller
					control={form.control}
					name='updateChannel'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={updateChannelId}>{t("settings.application.releaseChannel")}</FieldLabel>
							<UpdateChannelToggle id={updateChannelId} value={parseUpdateChannel(field.value)} onValueChange={field.onChange} />
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.application.trayTitle")}>
				<FormCheckbox control={form.control} name='closeToTray' id={closeToTrayId} label={t("settings.application.closeToTray")} />
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.application.privacyTitle")} description={t("settings.application.privacyDescription")}>
				<FormCheckbox control={form.control} name='sendCrashReports' id={sendCrashReportsId} label={t("settings.application.sendCrashReports")} />
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.application.externalLinksTitle")} description={t("settings.application.externalLinksDescription")}>
				<Field>
					<Textarea id={externalLinksId} className='min-h-28 font-mono text-xs' {...form.register("externalLinks")} />
					<SettingsFieldError<AppSettingsInput> name='externalLinks' />
				</Field>
			</SettingsSectionCard>
		</>
	);
}

function AutostartTrayField() {
	const { t } = useTranslation();
	const autostartTrayId = useId();
	const form = useFormContext<AppSettingsInput>();
	const autostart = form.watch("autostart");
	return <FormCheckbox control={form.control} name='autostartTray' id={autostartTrayId} label={t("settings.application.autostartTray")} disabled={!autostart} />;
}
