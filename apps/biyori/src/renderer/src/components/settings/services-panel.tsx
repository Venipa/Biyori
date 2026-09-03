import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { AniListAccountCard } from "@/mainview/components/anilist-account-card";
import { SettingsSectionCard } from "@/mainview/components/settings/settings-section-card";
import { SettingsToggleGroup } from "@/mainview/components/settings/settings-toggle-group";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/mainview/components/ui/field";

const DEFAULT_SERVICE_OPTIONS = [
	{ value: "anilist", label: "AniList" },
	{ value: "myanimelist", label: "MyAnimeList", disabled: true },
	{ value: "kitsu", label: "Kitsu", disabled: true },
] as const;

export function ServicesPanel() {
	const serviceId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<>
			<SettingsSectionCard title='Default list service' description='Choose which service your list, updates, and synchronization use by default.'>
				<Controller
					control={form.control}
					name='defaultService'
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid || undefined}>
							<FieldLabel htmlFor={serviceId}>Default service</FieldLabel>
							<SettingsToggleGroup
								id={serviceId}
								value={typeof field.value === "string" ? field.value : "anilist"}
								onValueChange={field.onChange}
								options={DEFAULT_SERVICE_OPTIONS}
								aria-invalid={fieldState.invalid}
							/>
							<FieldDescription>MyAnimeList and Kitsu are not available yet.</FieldDescription>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</SettingsSectionCard>
			<AniListAccountCard />
		</>
	);
}
