import { t, useTranslation } from "@biyori/translations/react";
import { UI_LOCALES } from "@biyori/translations/ui-locales";
import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { SettingsFieldError } from "@/mainview/components/app/settings/settings-field-error";
import { SettingsPageNav } from "@/mainview/components/app/settings/settings-page-nav";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { SettingsSelect } from "@/mainview/components/app/settings/settings-select";
import { FormCheckbox } from "@/mainview/components/app/shared/form-checkbox";
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

function listStatusLabel(status: string): string {
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
	const localeOptions = UI_LOCALES.map((item) => ({
		value: item.id,
		label: item.nativeLabel,
		disabled: !item.ready,
		hint: item.ready ? undefined : t("settings.application.languageToBeAdded"),
	}));
	const titleLanguageOptions = [
		{ value: "Romaji", label: t("settings.application.romaji") },
		{ value: "English", label: t("settings.application.english") },
		{ value: "Native", label: t("settings.application.native") },
	];
	const listStatusOptions = listStatusSchema.options.map((status) => ({
		value: status,
		label: listStatusLabel(status),
	}));
	const titleLanguageId = useId();
	const uiLocaleId = useId();
	const uiZoomId = useId();
	const defaultAddToListStatusId = useId();
	const autostartId = useId();
	const closeToTrayId = useId();
	const sendCrashReportsId = useId();
	const updateChannelId = useId();
	const externalLinksId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<SettingsPageNav>
			<SettingsSectionCard id='titles' title={t("settings.application.titlesTitle")} description={t("settings.application.titlesDescription")}>
				<Controller
					control={form.control}
					name='titleLanguage'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={titleLanguageId}>{t("settings.application.titleLanguage")}</FieldLabel>
							<SettingsSelect
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
			<SettingsSectionCard id='display' title={t("settings.application.displayTitle")} description={t("settings.application.displayDescription")}>
				<Controller
					control={form.control}
					name='uiLocale'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={uiLocaleId}>{t("settings.application.language")}</FieldLabel>
							<SettingsSelect
								id={uiLocaleId}
								value={typeof field.value === "string" ? field.value : "en"}
								onValueChange={field.onChange}
								options={localeOptions}
								aria-invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
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
			<SettingsSectionCard id='addToList' title={t("settings.application.addToListTitle")} description={t("settings.application.addToListDescription")}>
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
			<SettingsSectionCard id='startup' title={t("settings.application.startupTitle")}>
				<FormCheckbox control={form.control} name='autostart' id={autostartId} label={t("settings.application.autostart")} />
				<AutostartTrayField />
			</SettingsSectionCard>
			<SettingsSectionCard id='updates' title={t("settings.application.updatesTitle")} description={t("settings.application.updatesDescription")}>
				<Controller
					control={form.control}
					name='updateChannel'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={updateChannelId}>{t("settings.application.releaseChannel")}</FieldLabel>
							<SettingsSelect
								id={updateChannelId}
								value={parseUpdateChannel(field.value)}
								onValueChange={(value) => field.onChange(parseUpdateChannel(value))}
								options={[
									{ value: "stable", label: t("update.stable") },
									{ value: "beta", label: t("update.beta") },
									{ value: "alpha", label: t("update.alpha") },
								]}
								aria-invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard id='tray' title={t("settings.application.trayTitle")}>
				<FormCheckbox control={form.control} name='closeToTray' id={closeToTrayId} label={t("settings.application.closeToTray")} />
			</SettingsSectionCard>
			<SettingsSectionCard id='privacy' title={t("settings.application.privacyTitle")} description={t("settings.application.privacyDescription")}>
				<FormCheckbox control={form.control} name='sendCrashReports' id={sendCrashReportsId} label={t("settings.application.sendCrashReports")} />
			</SettingsSectionCard>
			<SettingsSectionCard id='externalLinks' title={t("settings.application.externalLinksTitle")} description={t("settings.application.externalLinksDescription")}>
				<Field>
					<Textarea id={externalLinksId} className='min-h-28 font-mono text-xs' {...form.register("externalLinks")} />
					<SettingsFieldError<AppSettingsInput> name='externalLinks' />
				</Field>
			</SettingsSectionCard>
		</SettingsPageNav>
	);
}

function AutostartTrayField() {
	const { t } = useTranslation();
	const autostartTrayId = useId();
	const form = useFormContext<AppSettingsInput>();
	const autostart = form.watch("autostart");
	return <FormCheckbox control={form.control} name='autostartTray' id={autostartTrayId} label={t("settings.application.autostartTray")} disabled={!autostart} />;
}
