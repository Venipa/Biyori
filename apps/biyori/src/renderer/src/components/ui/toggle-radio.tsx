import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

import { cn } from "@/mainview/lib/utils";

function ToggleRadio({ className, ...props }: RadioGroupPrimitive.Props) {
	return (
		<RadioGroupPrimitive
			data-slot='toggle-radio'
			className={cn("inline-flex w-fit items-center rounded-lg bg-muted p-0.75 text-muted-foreground", className)}
			{...props}
		/>
	);
}

function ToggleRadioItem({ className, ...props }: RadioPrimitive.Root.Props) {
	return (
		<RadioPrimitive.Root
			data-slot='toggle-radio-item'
			className={cn(
				"inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-foreground/60 outline-none transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-checked:bg-background data-checked:text-foreground data-checked:shadow-sm dark:data-checked:border-input dark:data-checked:bg-input/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

export { ToggleRadio, ToggleRadioItem };
