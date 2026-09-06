import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

import { cn } from "@/mainview/lib/utils";

function ToggleRadio({ className, ...props }: RadioGroupPrimitive.Props) {
	return (
		<RadioGroupPrimitive
			data-slot='toggle-radio'
			className={cn("inline-flex w-fit items-center rounded-lg border border-muted bg-transparent p-0.5 text-muted-foreground", className)}
			{...props}
		/>
	);
}

function ToggleRadioItem({ className, ...props }: RadioPrimitive.Root.Props) {
	return (
		<RadioPrimitive.Root
			data-slot='toggle-radio-item'
			className={cn(
				"inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent px-2 text-xs font-medium text-muted-foreground outline-none transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-checked:border-muted data-checked:bg-muted data-checked:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
				className,
			)}
			{...props}
		/>
	);
}

export { ToggleRadio, ToggleRadioItem };
