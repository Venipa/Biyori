import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Field, FieldLabel } from "@/mainview/components/ui/field";

type FormCheckboxProps<TFieldValues extends FieldValues> = {
	control: Control<TFieldValues>;
	name: FieldPath<TFieldValues>;
	id: string;
	label: string;
	disabled?: boolean;
};

export function FormCheckbox<TFieldValues extends FieldValues>({ control, name, id, label, disabled }: FormCheckboxProps<TFieldValues>) {
	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) => (
				<Field orientation='horizontal' data-disabled={disabled || undefined}>
					<Checkbox
						id={id}
						disabled={disabled}
						checked={Boolean(field.value)}
						onCheckedChange={(checked) => {
							field.onChange(checked === true);
						}}
					/>
					<FieldLabel htmlFor={id} className='font-normal'>
						{label}
					</FieldLabel>
				</Field>
			)}
		/>
	);
}
