import { cva, type VariantProps } from "class-variance-authority";
import { Input } from "@/mainview/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/mainview/components/ui/select";
import { cn } from "@/mainview/lib/utils";

const editableSelectVariants = cva("relative w-full min-w-0", {
	variants: {
		variant: {
			default: "",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

export type EditableSelectOption = {
	value: string;
	label: string;
};

type EditableSelectProps = VariantProps<typeof editableSelectVariants> & {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	options: readonly EditableSelectOption[];
	placeholder?: string;
	invalid?: boolean;
};

export function EditableSelect({
	id,
	value,
	onChange,
	options,
	placeholder,
	invalid,
	variant = "default",
}: EditableSelectProps) {
	const items = Object.fromEntries(
		options.map((option) => [option.value, option.label]),
	);
	const selected = options.some((option) => option.value === value)
		? value
		: undefined;

	return (
		<div className={cn(editableSelectVariants({ variant }))}>
			<Input
				id={id}
				value={value}
				placeholder={placeholder}
				aria-invalid={invalid || undefined}
				className="pr-9"
				onChange={(event) => {
					onChange(event.target.value);
				}}
			/>
			<Select
				value={selected}
				items={items}
				onValueChange={(next) => {
					if (typeof next === "string") {
						onChange(next);
					}
				}}
			>
				<SelectTrigger
					aria-label="Choose a preset"
					className="absolute top-0 right-0 h-8 w-8 border-0 bg-transparent px-0 shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
				/>
				<SelectContent
					align="end"
					alignItemWithTrigger={false}
					className="min-w-64"
				>
					<SelectGroup>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
