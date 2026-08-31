import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import { SettingsFieldError } from "@/mainview/components/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/settings/settings-section-card";
import { SettingsToggleGroup } from "@/mainview/components/settings/settings-toggle-group";
import { Field, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { Textarea } from "@/mainview/components/ui/textarea";
import { UpdateChannelToggle } from "@/mainview/components/update-channel-toggle";
import { listStatusSchema } from "@/shared/list";
import { parseUpdateChannel } from "@/shared/updater";

const TITLE_LANGUAGE_OPTIONS = [
	{ value: "Romaji", label: "Romaji" },
	{ value: "English", label: "English" },
	{ value: "Native", label: "Native" },
] as const;

const LIST_STATUS_OPTIONS = listStatusSchema.options.map((status) => ({
	value: status,
	label: status,
}));

export function ApplicationPanel() {
	const titleLanguageId = useId();
	const defaultAddToListStatusId = useId();
	const autostartId = useId();
	const closeToTrayId = useId();
	const updateChannelId = useId();
	const externalLinksId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<SettingsSectionCard title='Titles' description='How anime titles appear in lists and details.'>
				<Controller
					control={form.control}
					name='titleLanguage'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={titleLanguageId}>Title language</FieldLabel>
							<SettingsToggleGroup
								id={titleLanguageId}
								value={typeof field.value === "string" ? field.value : "Romaji"}
								onValueChange={field.onChange}
								options={TITLE_LANGUAGE_OPTIONS}
								aria-invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title='Add to list' description='Status used when you add a title to your list.'>
				<Controller
					control={form.control}
					name='defaultAddToListStatus'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={defaultAddToListStatusId}>Default status</FieldLabel>
							<SettingsToggleGroup
								id={defaultAddToListStatusId}
								value={typeof field.value === "string" ? field.value : "Plan to watch"}
								onValueChange={field.onChange}
								options={LIST_STATUS_OPTIONS}
								aria-invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title='Startup'>
				<FormCheckbox control={form.control} name='autostart' id={autostartId} label='Autostart' />
				<AutostartTrayField />
			</SettingsSectionCard>
			<SettingsSectionCard title='Updates' description='Which release channel the updater checks.'>
				<Controller
					control={form.control}
					name='updateChannel'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={updateChannelId}>Release channel</FieldLabel>
							<UpdateChannelToggle id={updateChannelId} value={parseUpdateChannel(field.value)} onValueChange={field.onChange} />
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<SettingsSectionCard title='Tray'>
				<FormCheckbox control={form.control} name='closeToTray' id={closeToTrayId} label='Close to tray' />
			</SettingsSectionCard>
			<SettingsSectionCard title='External links' description='One URL template per line. Used from title details.'>
				<Field>
					<Textarea id={externalLinksId} className='min-h-28 font-mono text-xs' {...form.register("externalLinks")} />
					<SettingsFieldError<AppSettingsInput> name='externalLinks' />
				</Field>
			</SettingsSectionCard>
		</>
	);
}

function AutostartTrayField() {
	const autostartTrayId = useId();
	const form = useFormContext<AppSettingsInput>();
	const autostart = form.watch("autostart");
	return <FormCheckbox control={form.control} name='autostartTray' id={autostartTrayId} label='Autostart in tray' disabled={!autostart} />;
}
