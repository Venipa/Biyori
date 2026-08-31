import { useId } from "react";
import { useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import { SettingsFieldError } from "@/mainview/components/settings/settings-field-error";
import { SettingsSectionCard } from "@/mainview/components/settings/settings-section-card";
import { Field, FieldDescription, FieldLabel } from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";

export function SharingPanel() {
	const presenceId = useId();
	const elapsedId = useId();
	const httpId = useId();
	const portId = useId();
	const clientId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<SettingsSectionCard title='Discord' description='Requires the Discord desktop client.'>
				<FormCheckbox control={form.control} name='updateRichPresence' id={presenceId} label='Update rich presence' />
				<Field>
					<FieldLabel htmlFor={clientId}>Application ID</FieldLabel>
					<Input id={clientId} placeholder='VITE_DISCORD_CLIENT_ID or paste here' {...form.register("discordApplicationId")} />
					<SettingsFieldError<AppSettingsInput> name='discordApplicationId' />
				</Field>
				<FormCheckbox control={form.control} name='showElapsedTime' id={elapsedId} label='Display elapsed time' />
			</SettingsSectionCard>
			<SettingsSectionCard title='HTTP' description='GET http://127.0.0.1:PORT returns now-playing JSON.'>
				<FormCheckbox control={form.control} name='enableHttp' id={httpId} label='Enable local HTTP server' />
				<Field>
					<FieldLabel htmlFor={portId}>Port</FieldLabel>
					<Input id={portId} type='number' className='w-28' {...form.register("httpPort", { valueAsNumber: true })} />
					<SettingsFieldError<AppSettingsInput> name='httpPort' />
				</Field>
				<FieldDescription>Leave this off unless another app on this machine needs now-playing data.</FieldDescription>
			</SettingsSectionCard>
		</>
	);
}
