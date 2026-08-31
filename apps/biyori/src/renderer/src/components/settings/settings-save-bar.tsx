import { useNavigate } from "@tanstack/react-router";
import { CircleAlertIcon } from "lucide-react";
import { type FieldErrors, type FieldPath, useFormContext, useFormState, useWatch } from "react-hook-form";
import type { SettingsFormInput, SettingsFormValues } from "@/lib/schemas/app-settings";
import { pickDirtySettings } from "@/lib/settings-dirty";
import { SaveBar } from "@/mainview/components/save-bar";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { FieldError } from "@/mainview/components/ui/field";
import { Spinner } from "@/mainview/components/ui/spinner";
import { settingsFieldSection } from "@/mainview/lib/settings-nav";
import { trpc } from "@/mainview/trpc";

function firstErrorPath(errors: FieldErrors): string | null {
	for (const [key, value] of Object.entries(errors)) {
		if (!value || key === "root") {
			continue;
		}
		if (typeof value === "object" && "message" in value && value.message && "type" in value) {
			return key;
		}
		if (typeof value === "object") {
			const nested = firstErrorPath(value as FieldErrors);
			if (nested) {
				return `${key}.${nested}`;
			}
		}
	}
	return null;
}

export function SettingsSaveBar() {
	const navigate = useNavigate();
	const saveSettings = trpc.settings.set.useMutation();
	const form = useFormContext<SettingsFormInput, unknown, SettingsFormValues>();
	const { isSubmitting, errors, defaultValues } = useFormState({
		control: form.control,
	});
	const values = useWatch({ control: form.control });
	const patch = pickDirtySettings(values ?? {}, defaultValues ?? {});
	const changeCount = Object.keys(patch).length;
	const dirty = changeCount > 0;
	const serverError = errors.root?.serverError;
	const open = dirty || Boolean(serverError) || isSubmitting;

	return (
		<SaveBar open={open} variant='float'>
			<Badge variant={serverError ? "destructive" : "secondary"} className='shrink-0'>
				<CircleAlertIcon data-icon='inline-start' />
				{changeCount}
			</Badge>
			<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<p className='truncate text-sm font-medium'>
					{serverError ? "Could not save" : changeCount === 1 ? "1 unsaved change" : `${changeCount} unsaved changes`}
				</p>
				<FieldError errors={[serverError]} />
			</div>
			<div className='flex shrink-0 items-center gap-2'>
				<Button
					variant='ghost'
					size='sm'
					type='button'
					disabled={isSubmitting}
					onClick={() => {
						form.clearErrors("root.serverError");
						form.reset();
					}}>
					Discard
				</Button>
				<Button
					size='sm'
					type='button'
					disabled={isSubmitting || !dirty}
					onClick={() => {
						void form.handleSubmit(
							async (data) => {
								try {
									const nextPatch = pickDirtySettings(data, form.formState.defaultValues ?? {});
									if (Object.keys(nextPatch).length === 0) {
										form.reset(data);
										return;
									}
									const saved = await saveSettings.mutateAsync(nextPatch);
									form.reset(saved);
								} catch (error) {
									form.setError("root.serverError", {
										message: error instanceof Error ? error.message : "Could not save settings",
									});
								}
							},
							(submitErrors) => {
								const path = firstErrorPath(submitErrors);
								const rootKey = path?.split(".")[0] ?? "";
								const section = settingsFieldSection[rootKey] ?? "application";
								void navigate({ to: `/settings/${section}` });
								if (path) {
									void form.setFocus(path as FieldPath<SettingsFormInput>);
								}
								form.setError("root.serverError", {
									message: path ? `Fix ${path} in ${section}` : "Fix invalid settings",
								});
							},
						)();
					}}>
					{isSubmitting ? <Spinner data-icon='inline-start' /> : null}
					Save
				</Button>
			</div>
		</SaveBar>
	);
}
