import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/mainview/lib/utils";

const filterPillButtonVariants = cva(
	"inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground outline-none select-none hover:bg-muted aria-expanded:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			size: {
				xs: "h-6 max-w-52 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 max-w-56 gap-1 px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
			},
		},
		defaultVariants: {
			size: "xs",
		},
	},
);

const FilterPillButton = React.forwardRef<HTMLButtonElement, ButtonPrimitive.Props & VariantProps<typeof filterPillButtonVariants>>(function FilterPillButton(
	{ className, size = "xs", type = "button", ...props },
	ref,
) {
	return <ButtonPrimitive ref={ref} type={type} data-slot='filter-pill-button' className={cn(filterPillButtonVariants({ size }), className)} {...props} />;
});

export { FilterPillButton, filterPillButtonVariants };
