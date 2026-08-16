import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
import { useId } from "react";
import { useFormContext } from "react-hook-form";

export function SharingPanel() {
	const presenceId = useId();
	const elapsedId = useId();
	const httpId = useId();
	const portId = useId();
	const clientId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<Tabs defaultValue="discord">
			<TabsList>
				<TabsTrigger value="discord">Discord</TabsTrigger>
				<TabsTrigger value="http">HTTP</TabsTrigger>
			</TabsList>
			<TabsContent value="discord" className="pt-4">
				<FieldGroup>
					<FormCheckbox
						control={form.control}
						name="updateRichPresence"
						id={presenceId}
						label="Update rich presence"
					/>
					<Field>
						<FieldLabel htmlFor={clientId}>Application ID</FieldLabel>
						<Input
							id={clientId}
							placeholder="VITE_DISCORD_CLIENT_ID or paste here"
							{...form.register("discordApplicationId")}
						/>
						<FieldError errors={[form.formState.errors.discordApplicationId]} />
					</Field>
					<FieldSet className="rounded-md border p-3">
						<FieldLegend variant="label" className="text-muted-foreground">
							Options
						</FieldLegend>
						<FormCheckbox
							control={form.control}
							name="showElapsedTime"
							id={elapsedId}
							label="Display elapsed time"
						/>
					</FieldSet>
					<FieldDescription>
						Note: Requires using the Discord desktop client.
					</FieldDescription>
				</FieldGroup>
			</TabsContent>
			<TabsContent value="http" className="pt-4">
				<FieldGroup>
					<FormCheckbox
						control={form.control}
						name="enableHttp"
						id={httpId}
						label="Enable local HTTP server"
					/>
					<Field>
						<FieldLabel htmlFor={portId}>Port</FieldLabel>
						<Input
							id={portId}
							type="number"
							className="w-28"
							{...form.register("httpPort", { valueAsNumber: true })}
						/>
						<FieldError errors={[form.formState.errors.httpPort]} />
					</Field>
					<FieldDescription>
						GET http://127.0.0.1:PORT returns now-playing JSON.
					</FieldDescription>
				</FieldGroup>
			</TabsContent>
		</Tabs>
	);
}
