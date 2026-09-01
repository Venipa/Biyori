import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/mainview/lib/utils";

const inputVariants = cva(
	"h-8 w-full min-w-0 rounded-lg px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
	{
		variants: {
			variant: {
				default:
					"border border-input bg-transparent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
				ghost:
					"border border-transparent bg-transparent hover:bg-muted focus-visible:border-ring focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-transparent aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-transparent dark:hover:bg-muted dark:disabled:bg-transparent dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & VariantProps<typeof inputVariants>>(function Input(
	{ className, type, variant = "default", ...props },
	ref,
) {
	return <input ref={ref} type={type} data-slot='input' data-variant={variant} className={cn(inputVariants({ variant }), className)} {...props} />;
});

export { Input, inputVariants };
