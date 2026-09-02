import { useFormContext, useFormState, useWatch } from "react-hook-form";
import type { SettingsFormInput, SettingsFormValues } from "@/lib/schemas/app-settings";
import { settingsFormIsDirty } from "@/lib/settings-dirty";
import { ConfirmEscape } from "@/mainview/components/confirm-escape";
import { trpc } from "@/mainview/trpc";

export function SettingsCloseGuard() {
	const closeWindow = trpc.desktop.closeWindow.useMutation();
	const form = useFormContext<SettingsFormInput, unknown, SettingsFormValues>();
	const { defaultValues } = useFormState({ control: form.control });
	const values = useWatch({ control: form.control });
	const dirty = settingsFormIsDirty(values ?? {}, defaultValues ?? {});

	return (
		<ConfirmEscape
			blocked={dirty}
			onConfirm={() => {
				closeWindow.mutate();
			}}
			title='Discard changes?'
			description='Unsaved settings will be lost.'
		/>
	);
}
