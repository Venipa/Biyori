import { TriangleAlertIcon } from "lucide-react";
import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { SettingsFieldError } from "@/mainview/components/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/settings/settings-section-card";
import { Alert, AlertDescription, AlertTitle } from "@/mainview/components/ui/alert";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/mainview/components/ui/input-group";
import { pickLibraryFolderPath } from "@/mainview/lib/library-folder";

export function AdvancedPanel() {
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
				<AlertTitle>Advanced</AlertTitle>
				<AlertDescription>Do not change these unless you know what they do.</AlertDescription>
			</Alert>
			<SettingsSectionCard title='Interface'>
				<Field>
					<FieldLabel htmlFor={themeId}>UI theme</FieldLabel>
					<Input id={themeId} className='max-w-64 font-mono text-xs' {...form.register("uiTheme")} />
					<SettingsFieldError<AppSettingsInput> name='uiTheme' />
				</Field>
			</SettingsSectionCard>
			<SettingsSectionCard title='Library'>
				<Field>
					<FieldLabel htmlFor={sizeId}>File size threshold</FieldLabel>
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
			<SettingsSectionCard title='Recognition'>
				<Field>
					<FieldLabel htmlFor={intervalId}>Media detection interval</FieldLabel>
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
			<SettingsSectionCard title='Torrents'>
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
								Use magnet links if available
							</FieldLabel>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
				<Field>
					<FieldLabel htmlFor={torrentFileId}>Download path for .torrent files</FieldLabel>
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
								Browse...
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
					<SettingsFieldError<AppSettingsInput> name='torrentFileDownloadPath' />
				</Field>
				<Field>
					<FieldLabel htmlFor={archiveId}>Archive limit</FieldLabel>
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
