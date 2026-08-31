import { type FieldPath, type FieldValues, get, useFormContext, useFormState } from "react-hook-form";
import { FieldError } from "@/mainview/components/ui/field";

export function SettingsFieldError<TFieldValues extends FieldValues>({ name }: { name: FieldPath<TFieldValues> }) {
	const { control } = useFormContext<TFieldValues>();
	const { errors } = useFormState({
		control,
		name,
		exact: true,
	});
	const error = get(errors, name) as { message?: string } | undefined;
	return <FieldError errors={[error]} />;
}
