import { useTranslation } from "@biyori/translations/react";
import { TriangleAlertIcon } from "lucide-react";
import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { SettingsFieldError } from "@/mainview/components/app/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/app/settings/settings-section-card";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/mainview/components/ui/input-group";
import { pickLibraryFolderPath } from "@/mainview/lib/library-folder";

export function AdvancedPanel() {
	const { t } = useTranslation();
	const themeId = useId();
	const sizeId = useId();
	const intervalId = useId();
	const magnetId = useId();
	const torrentFileId = useId();
	const archiveId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<Alert>
				<TriangleAlertIcon />
				<AlertTitle>{t("settings.advanced.warningTitle")}</AlertTitle>
				<AlertDescription>{t("settings.advanced.warning")}</AlertDescription>
			</Alert>
			<SettingsSectionCard title={t("settings.advanced.interfaceTitle")}>
				<Field>
					<FieldLabel htmlFor={themeId}>{t("settings.advanced.uiTheme")}</FieldLabel>
					<Input id={themeId} className='max-w-64 font-mono text-xs' {...form.register("uiTheme")} />
					<SettingsFieldError<AppSettingsInput> name='uiTheme' />
				</Field>
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.advanced.libraryTitle")}>
				<Field>
					<FieldLabel htmlFor={sizeId}>{t("settings.advanced.fileSize")}</FieldLabel>
					<Input
						id={sizeId}
						type='number'
						className='max-w-40 font-mono text-xs'
						{...form.register("fileSizeThreshold", {
							valueAsNumber: true,
						})}
					/>
					<SettingsFieldError<AppSettingsInput> name='fileSizeThreshold' />
				</Field>
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.advanced.recognitionTitle")}>
				<Field>
					<FieldLabel htmlFor={intervalId}>{t("settings.advanced.detectionInterval")}</FieldLabel>
					<Input
						id={intervalId}
						type='number'
						className='max-w-40 font-mono text-xs'
						{...form.register("mediaDetectionInterval", {
							valueAsNumber: true,
						})}
					/>
					<SettingsFieldError<AppSettingsInput> name='mediaDetectionInterval' />
				</Field>
			</SettingsSectionCard>
			<SettingsSectionCard title={t("settings.advanced.torrentsTitle")}>
				<Controller
					control={form.control}
					name='torrentUseMagnet'
					render={({ field, fieldState }) => (
						<Field orientation='horizontal' data-invalid={fieldState.invalid || undefined}>
							<Checkbox
								id={magnetId}
								checked={Boolean(field.value)}
								onCheckedChange={(checked) => {
									field.onChange(checked === true);
								}}
							/>
							<FieldLabel htmlFor={magnetId} className='font-normal'>
								{t("settings.advanced.useMagnet")}
							</FieldLabel>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
				<Field>
					<FieldLabel htmlFor={torrentFileId}>{t("settings.advanced.torrentPath")}</FieldLabel>
					<InputGroup>
						<InputGroupInput id={torrentFileId} className='font-mono text-xs' {...form.register("torrentFileDownloadPath")} />
						<InputGroupAddon align='inline-end'>
							<InputGroupButton
								variant='outline'
								onClick={() => {
									void pickLibraryFolderPath().then((path) => {
										if (path) {
											form.setValue("torrentFileDownloadPath", path, { shouldDirty: true });
										}
									});
								}}>
								{t("settings.advanced.browse")}
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
					<SettingsFieldError<AppSettingsInput> name='torrentFileDownloadPath' />
				</Field>
				<Field>
					<FieldLabel htmlFor={archiveId}>{t("settings.advanced.archiveLimit")}</FieldLabel>
					<Input
						id={archiveId}
						type='number'
						className='max-w-40 font-mono text-xs'
						{...form.register("torrentArchiveMaxCount", {
							valueAsNumber: true,
						})}
					/>
					<SettingsFieldError<AppSettingsInput> name='torrentArchiveMaxCount' />
				</Field>
			</SettingsSectionCard>
		</>
	);
}
